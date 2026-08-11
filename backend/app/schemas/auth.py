from pydantic import BaseModel

from app.schemas.teacher import TeacherOut

__all__ = ["LoginRequest", "TokenResponse", "RefreshRequest", "TeacherOut"]


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str