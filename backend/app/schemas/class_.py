import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SubjectCreate(BaseModel):
    name: str
    code: str | None = None


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str | None
    created_at: datetime


class ClassCreate(BaseModel):
    name: str
    section: str | None = None
    subject_ids: list[uuid.UUID] = []


class ClassUpdate(BaseModel):
    name: str | None = None
    section: str | None = None
    subject_ids: list[uuid.UUID] | None = None


class ClassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    section: str | None
    created_at: datetime
    subjects: list[SubjectOut] = []