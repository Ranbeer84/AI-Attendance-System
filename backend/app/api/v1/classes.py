import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_teacher
from app.models.class_ import Class
from app.models.subject import Subject
from app.schemas.class_ import ClassCreate, ClassUpdate, ClassOut, SubjectCreate, SubjectOut

router = APIRouter(tags=["classes"])


def _get_subjects_by_ids(db: Session, subject_ids: list[uuid.UUID]) -> list[Subject]:
    if not subject_ids:
        return []
    subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
    found_ids = {s.id for s in subjects}
    missing = set(subject_ids) - found_ids
    if missing:
        raise HTTPException(status_code=400, detail=f"Subject id(s) not found: {missing}")
    return subjects


# --- Subjects ---

@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    subject = Subject(**payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    return db.query(Subject).order_by(Subject.name).all()


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()


# --- Classes ---

@router.post("/classes", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
def create_class(
    payload: ClassCreate,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    subjects = _get_subjects_by_ids(db, payload.subject_ids)
    class_obj = Class(name=payload.name, section=payload.section, subjects=subjects)
    db.add(class_obj)
    db.commit()
    db.refresh(class_obj)
    return class_obj


@router.get("/classes", response_model=list[ClassOut])
def list_classes(
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    return db.query(Class).order_by(Class.name).all()


@router.get("/classes/{class_id}", response_model=ClassOut)
def get_class(
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    return class_obj


@router.put("/classes/{class_id}", response_model=ClassOut)
def update_class(
    class_id: uuid.UUID,
    payload: ClassUpdate,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "subject_ids" in update_data:
        subject_ids = update_data.pop("subject_ids")
        class_obj.subjects = _get_subjects_by_ids(db, subject_ids)
    for field, value in update_data.items():
        setattr(class_obj, field, value)

    db.commit()
    db.refresh(class_obj)
    return class_obj


@router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(class_obj)
    db.commit()