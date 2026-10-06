import uuid
from datetime import date as date_type, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, field_validator


# --- Phase 4: photo upload / job status (unchanged) ---

class UploadPhotoResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # pending | processing | completed | failed
    result: dict[str, Any] | None = None
    error: str | None = None


# --- Phase 5: confirm / persist attendance ---

AttendanceStatus = Literal["present", "absent", "late"]


class AttendanceRecordInput(BaseModel):
    student_id: uuid.UUID
    status: AttendanceStatus
    confidence: float | None = None  # from AI match; omit/None for manually added students


class AttendanceConfirmRequest(BaseModel):
    class_id: uuid.UUID
    subject_id: uuid.UUID | None = None
    date: date_type | None = None  # defaults to today if omitted
    source_photo_url: str | None = None
    records: list[AttendanceRecordInput]

    @field_validator("records")
    @classmethod
    def records_not_empty(cls, value: list[AttendanceRecordInput]) -> list[AttendanceRecordInput]:
        if not value:
            raise ValueError("records cannot be empty")
        return value


class AttendanceRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    class_id: uuid.UUID
    subject_id: uuid.UUID | None
    date: date_type
    status: str
    confidence: float | None
    source_photo_url: str | None
    marked_by_teacher_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class AttendanceConfirmResponse(BaseModel):
    class_id: uuid.UUID
    subject_id: uuid.UUID | None
    date: date_type
    total_records: int
    records: list[AttendanceRecordOut]