import uuid
from datetime import date as date_type
from io import BytesIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_teacher
from app.schemas.report import AttendanceReportResponse, DashboardStatsResponse, ExportFormat, ReportFilters
from app.services import report_service
from app.utils.export_utils import generate_csv_report, generate_excel_report, generate_pdf_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=AttendanceReportResponse)
def get_report(
    class_id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    return report_service.build_attendance_report(
        db, class_id=class_id, subject_id=subject_id, date_from=date_from, date_to=date_to
    )


@router.get("/dashboard-stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    return report_service.build_dashboard_stats(db)


@router.get("/export")
def export_report(
    format: ExportFormat = Query(..., description="pdf | excel | csv"),
    class_id: uuid.UUID | None = None,
    subject_id: uuid.UUID | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    db: Session = Depends(get_db),
    current_teacher=Depends(get_current_teacher),
):
    report = report_service.build_attendance_report(
        db, class_id=class_id, subject_id=subject_id, date_from=date_from, date_to=date_to
    )
    filters = report.filters

    if format == "pdf":
        content = generate_pdf_report(report.students, filters)
        media_type = "application/pdf"
        filename = "attendance_report.pdf"
    elif format == "excel":
        content = generate_excel_report(report.students, filters)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "attendance_report.xlsx"
    else:  # csv
        content = generate_csv_report(report.students)
        media_type = "text/csv"
        filename = "attendance_report.csv"

    return StreamingResponse(
        BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )