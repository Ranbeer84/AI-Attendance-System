import base64
import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from celery.result import AsyncResult
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.database import get_db
from app.workers.celery_app import celery_app
from app.workers.tasks import process_group_photo
from app.utils.image_utils import validate_image_upload, InvalidImageError
from app.core.config import settings
from app.schemas.attendance import (
    UploadPhotoResponse,
    JobStatusResponse,
    AttendanceConfirmRequest,
    AttendanceConfirmResponse,
    AttendanceRecordOut,
)
from app.services import attendance_service

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/upload-photo", response_model=UploadPhotoResponse)
async def upload_photo(
    file: UploadFile = File(...),
    class_id: uuid.UUID | None = Form(None),
    current_teacher=Depends(get_current_teacher),
):
    content = await file.read()
    try:
        validate_image_upload(file.content_type, len(content), settings.MAX_UPLOAD_SIZE_MB)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    image_b64 = base64.b64encode(content).decode("utf-8")

    task = process_group_photo.delay(
        image_b64, file.content_type, str(class_id) if class_id else None
    )

    return UploadPhotoResponse(job_id=task.id, status="queued")


@router.get("/status/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, current_teacher=Depends(get_current_teacher)):
    result = AsyncResult(job_id, app=celery_app)

    if result.state == "PENDING":
        return JobStatusResponse(job_id=job_id, status="pending")
    elif result.state == "STARTED":
        return JobStatusResponse(job_id=job_id, status="processing")
    elif result.state == "SUCCESS":
        payload = result.result
        if isinstance(payload, dict) and "error" in payload:
            return JobStatusResponse(job_id=job_id, status="failed", error=payload["error"])
        return JobStatusResponse(job_id=job_id, status="completed", result=payload)
    elif result.state == "FAILURE":
        return JobStatusResponse(job_id=job_id, status="failed", error=str(result.info))
    else:
        return JobStatusResponse(job_id=job_id, status=result.state.lower())


@router.post("/confirm", response_model=AttendanceConfirmResponse)
def confirm_attendance(
    payload: AttendanceConfirmRequest,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    """
    Called after the teacher has reviewed the AI preview (from /status/{job_id})
    and made any manual corrections (changing a match, marking an unmatched
    face as a specific student, marking someone absent, etc.). Persists the
    final, teacher-approved attendance for the given class/subject/date.
    """
    try:
        saved_records = attendance_service.confirm_attendance(db, current_teacher.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    attendance_date = payload.date or date_type.today()

    return AttendanceConfirmResponse(
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        date=attendance_date,
        total_records=len(saved_records),
        records=[AttendanceRecordOut.model_validate(r) for r in saved_records],
    )


@router.get("/history", response_model=list[AttendanceRecordOut])
def get_attendance_history(
    class_id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    student_id: uuid.UUID | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    records = attendance_service.get_attendance(
        db,
        class_id=class_id,
        subject_id=subject_id,
        student_id=student_id,
        date_from=date_from,
        date_to=date_to,
    )
    return records