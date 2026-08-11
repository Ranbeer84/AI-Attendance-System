import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_teacher
from app.schemas.face import FaceRegistrationSummary
from app.services import student_service

router = APIRouter(prefix="/students", tags=["face-registration"])

MAX_FILES_PER_UPLOAD = 30


@router.post("/{student_id}/register-face", response_model=FaceRegistrationSummary)
async def register_face(
    student_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    student = student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if len(files) > MAX_FILES_PER_UPLOAD:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files in one request. Max {MAX_FILES_PER_UPLOAD} photos per upload.",
        )

    file_payloads = []
    for f in files:
        content = await f.read()
        file_payloads.append((f.filename, content, f.content_type))

    return student_service.register_face_batch(db, student, file_payloads)