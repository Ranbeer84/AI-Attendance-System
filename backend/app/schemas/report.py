import uuid
from datetime import date as date_type
from typing import Literal

from pydantic import BaseModel


ExportFormat = Literal["pdf", "excel", "csv"]


class StudentAttendanceSummary(BaseModel):
    student_id: uuid.UUID
    student_name: str
    roll_number: str
    total_sessions: int
    present_count: int
    absent_count: int
    late_count: int
    attendance_percentage: float


class ClassAttendanceSummary(BaseModel):
    class_id: uuid.UUID | None
    class_name: str | None
    total_sessions: int
    average_attendance_percentage: float


class ReportFilters(BaseModel):
    class_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    date_from: date_type | None = None
    date_to: date_type | None = None


class AttendanceReportResponse(BaseModel):
    filters: ReportFilters
    class_summary: ClassAttendanceSummary
    students: list[StudentAttendanceSummary]


class ClassAttendanceBreakdown(BaseModel):
    class_id: uuid.UUID
    class_name: str
    average_attendance_percentage: float
    total_students: int


class DashboardStatsResponse(BaseModel):
    total_students: int
    total_classes: int
    sessions_today: int
    average_attendance_percentage_last_30_days: float
    attendance_trend: list[dict]  # [{"date": "2026-07-20", "percentage": 91.2}, ...]
    class_breakdown: list[ClassAttendanceBreakdown]  # new in Phase 9