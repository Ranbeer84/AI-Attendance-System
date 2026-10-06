import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_teacher
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut
from app.services import student_service
from app.utils.image_utils import InvalidImageError

router = APIRouter(prefix="/students", tags=["students"])


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    return student_service.create_student(db, payload)


@router.get("", response_model=list[StudentOut])
def list_students(
    skip: int = 0,
    limit: int = 50,
    class_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    return student_service.get_students(db, skip=skip, limit=limit, class_id=class_id)


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    student = student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: uuid.UUID,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    student = student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student_service.update_student(db, student, payload)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    student = student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student_service.delete_student(db, student)


@router.post("/{student_id}/photo", response_model=StudentOut)
async def upload_profile_photo(
    student_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    student = student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    file_bytes = await file.read()
    try:
        return student_service.set_profile_photo(db, student, file_bytes, file.content_type)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc))