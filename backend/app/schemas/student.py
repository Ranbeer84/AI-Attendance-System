import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict


class StudentBase(BaseModel):
    name: str
    roll_number: str
    email: EmailStr | None = None
    class_id: uuid.UUID | None = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: str | None = None
    roll_number: str | None = None
    email: EmailStr | None = None
    class_id: uuid.UUID | None = None
    is_active: bool | None = None


class StudentOut(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    profile_photo_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime