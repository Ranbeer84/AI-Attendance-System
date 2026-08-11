import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_teacher
from app.core.security import hash_password
from app.models.teacher import Teacher
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherOut

router = APIRouter(prefix="/teachers", tags=["teachers"])


@router.post("", response_model=TeacherOut, status_code=status.HTTP_201_CREATED)
def create_teacher(
    payload: TeacherCreate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    existing = db.query(Teacher).filter(Teacher.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A teacher with this email already exists")

    teacher = Teacher(
        id=uuid.uuid4(),
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_active=True,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


@router.get("", response_model=list[TeacherOut])
def list_teachers(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    return db.query(Teacher).order_by(Teacher.name).offset(skip).limit(limit).all()


@router.get("/{teacher_id}", response_model=TeacherOut)
def get_teacher(
    teacher_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher


@router.put("/{teacher_id}", response_model=TeacherOut)
def update_teacher(
    teacher_id: uuid.UUID,
    payload: TeacherUpdate,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            teacher.hashed_password = hash_password(password)
    for field, value in update_data.items():
        setattr(teacher, field, value)

    db.commit()
    db.refresh(teacher)
    return teacher


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
    teacher_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_teacher: Teacher = Depends(get_current_teacher),
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    db.delete(teacher)
    db.commit()