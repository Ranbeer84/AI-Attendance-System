import numpy as np
from sqlalchemy.orm import Session

from app.ai.face_detector import FaceDetector
from app.ai.face_embedder import FaceEmbedder
from app.ai.face_matcher import find_best_match
from app.models.student import Student
import uuid

_detector: FaceDetector | None = None
_embedder: FaceEmbedder | None = None


def _get_detector() -> FaceDetector:
    global _detector
    if _detector is None:
        _detector = FaceDetector()
    return _detector


def _get_embedder() -> FaceEmbedder:
    global _embedder
    if _embedder is None:
        _embedder = FaceEmbedder()
    return _embedder


def process_group_photo_image(
    db: Session,
    image_bgr: np.ndarray,
    class_id: uuid.UUID | None = None,
) -> list[dict]:
    """
    Full pipeline for a group photo: detect all faces -> align+embed each ->
    match each against stored embeddings -> return per-face results with
    bounding box, matched student (if any), and confidence score.
    """
    detector = _get_detector()
    embedder = _get_embedder()

    faces = detector.detect_faces(image_bgr)
    results = []

    for face in faces:
        kps = np.array(face["kps"], dtype=np.float32)
        embedding = embedder.get_embedding(image_bgr, kps)

        match = find_best_match(db, embedding.tolist(), class_id=class_id)

        entry = {
            "bbox": face["bbox"],
            "det_score": face["det_score"],
        }

        if match:
            student = db.query(Student).filter(Student.id == match.student_id).first()
            entry.update(
                {
                    "status": "matched",
                    "student_id": str(match.student_id),
                    "student_name": student.name if student else None,
                    "confidence": round(match.similarity, 4),
                }
            )
        else:
            entry.update(
                {
                    "status": "unknown",
                    "student_id": None,
                    "student_name": None,
                    "confidence": None,
                }
            )

        results.append(entry)

    return results