import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict, Field


class TeacherCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)


class TeacherUpdate(BaseModel):
    name: str | None = None
    password: str | None = Field(default=None, min_length=8)
    is_active: bool | None = None


class TeacherOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    is_active: bool
    created_at: datetime