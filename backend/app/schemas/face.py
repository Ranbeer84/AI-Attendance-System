import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FaceEmbeddingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    source_photo_url: str | None
    det_score: float | None
    created_at: datetime


class FaceRegistrationResult(BaseModel):
    filename: str
    status: str  # "success" | "failed"
    reason: str | None = None
    embedding_id: uuid.UUID | None = None


class FaceRegistrationSummary(BaseModel):
    student_id: uuid.UUID
    total_uploaded: int
    successful: int
    failed: int
    results: list[FaceRegistrationResult]