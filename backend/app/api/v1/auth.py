from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token, create_access_token
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, TeacherOut
from app.services.auth_service import authenticate_teacher, generate_tokens_for_teacher
from app.api.deps import get_current_teacher
from app.models.teacher import Teacher

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    teacher = authenticate_teacher(db, payload.email, payload.password)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    tokens = generate_tokens_for_teacher(teacher)
    return TokenResponse(**tokens)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest):
    decoded = decode_token(payload.refresh_token)
    if decoded is None or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    new_access_token = create_access_token(decoded["sub"])
    return TokenResponse(access_token=new_access_token, refresh_token=payload.refresh_token)


@router.get("/me", response_model=TeacherOut)
def get_me(current_teacher: Teacher = Depends(get_current_teacher)):
    return current_teacher