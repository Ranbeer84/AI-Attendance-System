import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.teacher import Teacher

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_teacher(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Teacher:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    teacher_id = payload.get("sub")
    if teacher_id is None:
        raise credentials_exception

    try:
        teacher_uuid = uuid.UUID(teacher_id)
    except ValueError:
        raise credentials_exception

    teacher = db.query(Teacher).filter(Teacher.id == teacher_uuid).first()
    if teacher is None or not teacher.is_active:
        raise credentials_exception

    return teacher