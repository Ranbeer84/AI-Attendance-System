from sqlalchemy.orm import Session

from app.models.teacher import Teacher
from app.core.security import verify_password, create_access_token, create_refresh_token


def get_teacher_by_email(db: Session, email: str) -> Teacher | None:
    return db.query(Teacher).filter(Teacher.email == email).first()


def authenticate_teacher(db: Session, email: str, password: str) -> Teacher | None:
    teacher = get_teacher_by_email(db, email)
    if not teacher:
        return None
    if not verify_password(password, teacher.hashed_password):
        return None
    if not teacher.is_active:
        return None
    return teacher


def generate_tokens_for_teacher(teacher: Teacher) -> dict[str, str]:
    subject = str(teacher.id)
    return {
        "access_token": create_access_token(subject),
        "refresh_token": create_refresh_token(subject),
    }