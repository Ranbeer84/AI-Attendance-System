import uuid
from datetime import date as date_type, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.student import Student
from app.models.class_ import Class
from app.schemas.report import (
    StudentAttendanceSummary,
    ClassAttendanceSummary,
    ReportFilters,
    AttendanceReportResponse,
    DashboardStatsResponse,
    ClassAttendanceBreakdown,
)


def _apply_filters(query, class_id, subject_id, date_from, date_to):
    if class_id is not None:
        query = query.filter(AttendanceRecord.class_id == class_id)
    if subject_id is not None:
        query = query.filter(AttendanceRecord.subject_id == subject_id)
    if date_from is not None:
        query = query.filter(AttendanceRecord.date >= date_from)
    if date_to is not None:
        query = query.filter(AttendanceRecord.date <= date_to)
    return query


def build_attendance_report(
    db: Session,
    class_id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
) -> AttendanceReportResponse:
    """
    Aggregates attendance per student for the given filters: total sessions,
    present/absent/late counts, and attendance percentage. Grouping by
    status in Python (rather than a dialect-specific SQL pivot/CASE) keeps
    this portable across Postgres versions without conditional-aggregation
    syntax quirks.
    """
    query = (
        db.query(
            Student.id,
            Student.name,
            Student.roll_number,
            AttendanceRecord.status,
            func.count(AttendanceRecord.id),
        )
        .join(AttendanceRecord, AttendanceRecord.student_id == Student.id)
        .group_by(Student.id, Student.name, Student.roll_number, AttendanceRecord.status)
    )
    query = _apply_filters(query, class_id, subject_id, date_from, date_to)
    rows = query.all()

    per_student: dict[uuid.UUID, dict] = {}
    for student_id, student_name, roll_number, status, count in rows:
        entry = per_student.setdefault(
            student_id,
            {"name": student_name, "roll_number": roll_number, "present": 0, "absent": 0, "late": 0},
        )
        if status in entry:
            entry[status] = count

    students: list[StudentAttendanceSummary] = []
    for student_id, data in per_student.items():
        total = data["present"] + data["absent"] + data["late"]
        percentage = round((data["present"] + data["late"]) / total * 100, 2) if total > 0 else 0.0
        students.append(
            StudentAttendanceSummary(
                student_id=student_id,
                student_name=data["name"],
                roll_number=data["roll_number"],
                total_sessions=total,
                present_count=data["present"],
                absent_count=data["absent"],
                late_count=data["late"],
                attendance_percentage=percentage,
            )
        )

    students.sort(key=lambda s: s.roll_number)

    class_name = None
    if class_id is not None:
        class_obj = db.query(Class).filter(Class.id == class_id).first()
        class_name = class_obj.name if class_obj else None

    total_sessions = sum(s.total_sessions for s in students)
    avg_percentage = (
        round(sum(s.attendance_percentage for s in students) / len(students), 2) if students else 0.0
    )

    return AttendanceReportResponse(
        filters=ReportFilters(class_id=class_id, subject_id=subject_id, date_from=date_from, date_to=date_to),
        class_summary=ClassAttendanceSummary(
            class_id=class_id,
            class_name=class_name,
            total_sessions=total_sessions,
            average_attendance_percentage=avg_percentage,
        ),
        students=students,
    )


def build_dashboard_stats(db: Session) -> DashboardStatsResponse:
    total_students = db.query(func.count(Student.id)).filter(Student.is_active.is_(True)).scalar() or 0
    total_classes = db.query(func.count(Class.id)).scalar() or 0

    today = date_type.today()

    # "Sessions today" = distinct (class, subject) combinations that had
    # attendance marked today -- a reasonable proxy for "how many periods
    # were taken today" without a separate sessions table.
    sessions_today = (
        db.query(AttendanceRecord.class_id, AttendanceRecord.subject_id)
        .filter(AttendanceRecord.date == today)
        .distinct()
        .count()
    )

    thirty_days_ago = today - timedelta(days=30)

    trend_rows = (
        db.query(AttendanceRecord.date, AttendanceRecord.status, func.count(AttendanceRecord.id))
        .filter(AttendanceRecord.date >= thirty_days_ago)
        .group_by(AttendanceRecord.date, AttendanceRecord.status)
        .order_by(AttendanceRecord.date)
        .all()
    )

    per_day: dict[date_type, dict] = {}
    for record_date, status, count in trend_rows:
        entry = per_day.setdefault(record_date, {"present": 0, "absent": 0, "late": 0})
        if status in entry:
            entry[status] = count

    trend = []
    all_percentages = []
    for record_date in sorted(per_day.keys()):
        counts = per_day[record_date]
        total = counts["present"] + counts["absent"] + counts["late"]
        percentage = round((counts["present"] + counts["late"]) / total * 100, 2) if total > 0 else 0.0
        trend.append({"date": record_date.isoformat(), "percentage": percentage})
        all_percentages.append(percentage)

    avg_last_30 = round(sum(all_percentages) / len(all_percentages), 2) if all_percentages else 0.0

    return DashboardStatsResponse(
        total_students=total_students,
        total_classes=total_classes,
        sessions_today=sessions_today,
        average_attendance_percentage_last_30_days=avg_last_30,
        attendance_trend=trend,
    )

def build_dashboard_stats(db: Session) -> DashboardStatsResponse:
    total_students = db.query(func.count(Student.id)).filter(Student.is_active.is_(True)).scalar() or 0
    total_classes = db.query(func.count(Class.id)).scalar() or 0

    today = date_type.today()

    sessions_today = (
        db.query(AttendanceRecord.class_id, AttendanceRecord.subject_id)
        .filter(AttendanceRecord.date == today)
        .distinct()
        .count()
    )

    thirty_days_ago = today - timedelta(days=30)

    trend_rows = (
        db.query(AttendanceRecord.date, AttendanceRecord.status, func.count(AttendanceRecord.id))
        .filter(AttendanceRecord.date >= thirty_days_ago)
        .group_by(AttendanceRecord.date, AttendanceRecord.status)
        .order_by(AttendanceRecord.date)
        .all()
    )

    per_day: dict[date_type, dict] = {}
    for record_date, status, count in trend_rows:
        entry = per_day.setdefault(record_date, {"present": 0, "absent": 0, "late": 0})
        if status in entry:
            entry[status] = count

    trend = []
    all_percentages = []
    for record_date in sorted(per_day.keys()):
        counts = per_day[record_date]
        total = counts["present"] + counts["absent"] + counts["late"]
        percentage = round((counts["present"] + counts["late"]) / total * 100, 2) if total > 0 else 0.0
        trend.append({"date": record_date.isoformat(), "percentage": percentage})
        all_percentages.append(percentage)

    avg_last_30 = round(sum(all_percentages) / len(all_percentages), 2) if all_percentages else 0.0

    # --- Class-wise breakdown (new in Phase 9) ---
    class_rows = (
        db.query(
            AttendanceRecord.class_id,
            Class.name,
            AttendanceRecord.status,
            func.count(AttendanceRecord.id),
        )
        .join(Class, Class.id == AttendanceRecord.class_id)
        .filter(AttendanceRecord.date >= thirty_days_ago)
        .group_by(AttendanceRecord.class_id, Class.name, AttendanceRecord.status)
        .all()
    )

    per_class: dict[uuid.UUID, dict] = {}
    for class_id, class_name, status, count in class_rows:
        entry = per_class.setdefault(
            class_id, {"name": class_name, "present": 0, "absent": 0, "late": 0}
        )
        if status in entry:
            entry[status] = count

    student_counts_by_class = dict(
        db.query(Student.class_id, func.count(Student.id))
        .filter(Student.is_active.is_(True), Student.class_id.isnot(None))
        .group_by(Student.class_id)
        .all()
    )

    class_breakdown = []
    for class_id, data in per_class.items():
        total = data["present"] + data["absent"] + data["late"]
        percentage = round((data["present"] + data["late"]) / total * 100, 2) if total > 0 else 0.0
        class_breakdown.append(
            ClassAttendanceBreakdown(
                class_id=class_id,
                class_name=data["name"],
                average_attendance_percentage=percentage,
                total_students=student_counts_by_class.get(class_id, 0),
            )
        )
    class_breakdown.sort(key=lambda c: c.class_name)

    return DashboardStatsResponse(
        total_students=total_students,
        total_classes=total_classes,
        sessions_today=sessions_today,
        average_attendance_percentage_last_30_days=avg_last_30,
        attendance_trend=trend,
        class_breakdown=class_breakdown,
    )