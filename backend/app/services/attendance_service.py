import uuid
from datetime import date as date_type

from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.student import Student
from app.schemas.attendance import AttendanceConfirmRequest


def confirm_attendance(
    db: Session,
    teacher_id: uuid.UUID,
    payload: AttendanceConfirmRequest,
) -> list[AttendanceRecord]:
    """
    Upserts one attendance record per (student, class, subject, date).
    If a record already exists for that combination (e.g. teacher re-submits
    a correction), it's updated in place rather than duplicated.
    """
    attendance_date = payload.date or date_type.today()

    student_ids = [r.student_id for r in payload.records]
    valid_students = {
        s.id for s in db.query(Student.id).filter(Student.id.in_(student_ids)).all()
    }
    missing = set(student_ids) - valid_students
    if missing:
        raise ValueError(f"Unknown student id(s): {missing}")

    saved_records: list[AttendanceRecord] = []

    for record_input in payload.records:
        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.student_id == record_input.student_id,
                AttendanceRecord.class_id == payload.class_id,
                AttendanceRecord.subject_id == payload.subject_id,
                AttendanceRecord.date == attendance_date,
            )
            .first()
        )

        if existing:
            existing.status = record_input.status
            existing.confidence = record_input.confidence
            existing.source_photo_url = payload.source_photo_url
            existing.marked_by_teacher_id = teacher_id
            saved_records.append(existing)
        else:
            new_record = AttendanceRecord(
                student_id=record_input.student_id,
                class_id=payload.class_id,
                subject_id=payload.subject_id,
                date=attendance_date,
                status=record_input.status,
                confidence=record_input.confidence,
                source_photo_url=payload.source_photo_url,
                marked_by_teacher_id=teacher_id,
            )
            db.add(new_record)
            saved_records.append(new_record)

    db.commit()
    for record in saved_records:
        db.refresh(record)

    return saved_records


def get_attendance(
    db: Session,
    class_id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    student_id: uuid.UUID | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
) -> list[AttendanceRecord]:
    query = db.query(AttendanceRecord)

    if class_id is not None:
        query = query.filter(AttendanceRecord.class_id == class_id)
    if subject_id is not None:
        query = query.filter(AttendanceRecord.subject_id == subject_id)
    if student_id is not None:
        query = query.filter(AttendanceRecord.student_id == student_id)
    if date_from is not None:
        query = query.filter(AttendanceRecord.date >= date_from)
    if date_to is not None:
        query = query.filter(AttendanceRecord.date <= date_to)

    return query.order_by(AttendanceRecord.date.desc()).all()