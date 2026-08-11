import uuid

import cv2
import numpy as np
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.face_embedding import FaceEmbedding
from app.schemas.student import StudentCreate, StudentUpdate
from app.schemas.face import FaceRegistrationResult, FaceRegistrationSummary
from app.services.storage_service import storage_service
from app.utils.image_utils import validate_image_upload, process_profile_photo, InvalidImageError
from app.core.config import settings
from app.ai.face_detector import FaceDetector
from app.ai.face_embedder import FaceEmbedder


# --- Student CRUD (Phase 2) ---

def create_student(db: Session, payload: StudentCreate) -> Student:
    student = Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def get_student(db: Session, student_id: uuid.UUID) -> Student | None:
    return db.query(Student).filter(Student.id == student_id).first()


def get_students(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    class_id: uuid.UUID | None = None,
) -> list[Student]:
    query = db.query(Student)
    if class_id is not None:
        query = query.filter(Student.class_id == class_id)
    return query.order_by(Student.name).offset(skip).limit(limit).all()


def update_student(db: Session, student: Student, payload: StudentUpdate) -> Student:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, student: Student) -> None:
    if student.profile_photo_url:
        storage_service.delete_file_by_url(student.profile_photo_url)
    db.delete(student)
    db.commit()


def set_profile_photo(db: Session, student: Student, file_bytes: bytes, content_type: str) -> Student:
    validate_image_upload(content_type, len(file_bytes), settings.MAX_UPLOAD_SIZE_MB)
    processed_bytes, processed_content_type = process_profile_photo(file_bytes)

    if student.profile_photo_url:
        storage_service.delete_file_by_url(student.profile_photo_url)

    new_url = storage_service.upload_file(
        processed_bytes, folder="student-profiles", content_type=processed_content_type
    )
    student.profile_photo_url = new_url
    db.commit()
    db.refresh(student)
    return student


# --- Face registration (Phase 3) ---

_face_detector: FaceDetector | None = None
_face_embedder: FaceEmbedder | None = None


def _get_detector() -> FaceDetector:
    global _face_detector
    if _face_detector is None:
        _face_detector = FaceDetector()
    return _face_detector


def _get_embedder() -> FaceEmbedder:
    global _face_embedder
    if _face_embedder is None:
        _face_embedder = FaceEmbedder()
    return _face_embedder


def _decode_image(file_bytes: bytes) -> np.ndarray | None:
    array = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    return image


def register_face_batch(
    db: Session,
    student: Student,
    file_payloads: list[tuple[str, bytes, str]],
) -> FaceRegistrationSummary:
    """
    Processes a batch of uploaded photos for one student:
    validate -> decode -> detect exactly one face -> embed -> store.
    Each photo succeeds or fails independently; one bad photo doesn't
    block the rest of the batch.
    """
    detector = _get_detector()
    embedder = _get_embedder()

    results: list[FaceRegistrationResult] = []
    successful = 0

    for filename, content, content_type in file_payloads:
        try:
            validate_image_upload(content_type, len(content), settings.MAX_UPLOAD_SIZE_MB)
        except InvalidImageError as exc:
            results.append(FaceRegistrationResult(filename=filename, status="failed", reason=str(exc)))
            continue

        image = _decode_image(content)
        if image is None:
            results.append(
                FaceRegistrationResult(filename=filename, status="failed", reason="Could not decode image")
            )
            continue

        faces = detector.detect_faces(image)

        if len(faces) == 0:
            results.append(
                FaceRegistrationResult(filename=filename, status="failed", reason="No face detected")
            )
            continue

        if len(faces) > 1:
            results.append(
                FaceRegistrationResult(
                    filename=filename,
                    status="failed",
                    reason="Multiple faces detected; upload one face per photo",
                )
            )
            continue

        face = faces[0]
        kps = np.array(face["kps"], dtype=np.float32)
        embedding = embedder.get_embedding(image, kps)

        source_url = None
        try:
            source_url = storage_service.upload_file(
                content, folder=f"face-registrations/{student.id}", content_type=content_type
            )
        except Exception:
            source_url = None  # storage failure shouldn't discard a good embedding

        embedding_row = FaceEmbedding(
            student_id=student.id,
            embedding=embedding.tolist(),
            source_photo_url=source_url,
            det_score=face["det_score"],
        )
        db.add(embedding_row)
        db.commit()
        db.refresh(embedding_row)

        results.append(
            FaceRegistrationResult(filename=filename, status="success", embedding_id=embedding_row.id)
        )
        successful += 1

    return FaceRegistrationSummary(
        student_id=student.id,
        total_uploaded=len(file_payloads),
        successful=successful,
        failed=len(file_payloads) - successful,
        results=results,
    )