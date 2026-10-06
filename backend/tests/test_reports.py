import uuid
from datetime import date

from app.models.student import Student
from app.models.attendance import AttendanceRecord


def _seed_attendance(db_session, test_class, test_subject):
    student_a = Student(id=uuid.uuid4(), name="Alice", roll_number="R100", class_id=test_class.id)
    student_b = Student(id=uuid.uuid4(), name="Bob", roll_number="R101", class_id=test_class.id)
    db_session.add_all([student_a, student_b])
    db_session.commit()

    records = [
        AttendanceRecord(student_id=student_a.id, class_id=test_class.id, subject_id=test_subject.id,
                          date=date(2026, 7, 1), status="present"),
        AttendanceRecord(student_id=student_a.id, class_id=test_class.id, subject_id=test_subject.id,
                          date=date(2026, 7, 2), status="absent"),
        AttendanceRecord(student_id=student_a.id, class_id=test_class.id, subject_id=test_subject.id,
                          date=date(2026, 7, 3), status="present"),
        AttendanceRecord(student_id=student_b.id, class_id=test_class.id, subject_id=test_subject.id,
                          date=date(2026, 7, 1), status="present"),
        AttendanceRecord(student_id=student_b.id, class_id=test_class.id, subject_id=test_subject.id,
                          date=date(2026, 7, 2), status="present"),
    ]
    db_session.add_all(records)
    db_session.commit()
    return student_a, student_b


def test_get_report_basic(client, auth_headers, test_class, test_subject, db_session):
    student_a, student_b = _seed_attendance(db_session, test_class, test_subject)

    response = client.get(f"/api/v1/reports?class_id={test_class.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    students_by_id = {s["student_id"]: s for s in data["students"]}

    alice = students_by_id[str(student_a.id)]
    assert alice["total_sessions"] == 3
    assert alice["present_count"] == 2
    assert alice["absent_count"] == 1
    assert round(alice["attendance_percentage"], 1) == round(2 / 3 * 100, 1)

    bob = students_by_id[str(student_b.id)]
    assert bob["total_sessions"] == 2
    assert bob["present_count"] == 2
    assert bob["attendance_percentage"] == 100.0


def test_get_report_date_filtered(client, auth_headers, test_class, test_subject, db_session):
    student_a, _ = _seed_attendance(db_session, test_class, test_subject)

    response = client.get(
        f"/api/v1/reports?class_id={test_class.id}&date_from=2026-07-01&date_to=2026-07-01",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    students_by_id = {s["student_id"]: s for s in data["students"]}
    assert students_by_id[str(student_a.id)]["total_sessions"] == 1


def test_get_report_requires_auth(client):
    response = client.get("/api/v1/reports")
    assert response.status_code == 401


def test_dashboard_stats(client, auth_headers, test_class, test_subject, db_session):
    _seed_attendance(db_session, test_class, test_subject)

    response = client.get("/api/v1/reports/dashboard-stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_students"] >= 2
    assert data["total_classes"] >= 1
    assert "attendance_trend" in data


def test_export_csv(client, auth_headers, test_class, test_subject, db_session):
    _seed_attendance(db_session, test_class, test_subject)

    response = client.get(
        f"/api/v1/reports/export?format=csv&class_id={test_class.id}", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    body = response.content.decode("utf-8")
    assert "Roll No." in body
    assert "Alice" in body


def test_export_excel(client, auth_headers, test_class, test_subject, db_session):
    _seed_attendance(db_session, test_class, test_subject)

    response = client.get(
        f"/api/v1/reports/export?format=excel&class_id={test_class.id}", headers=auth_headers
    )
    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"]
    assert len(response.content) > 0


def test_export_pdf(client, auth_headers, test_class, test_subject, db_session):
    _seed_attendance(db_session, test_class, test_subject)

    response = client.get(
        f"/api/v1/reports/export?format=pdf&class_id={test_class.id}", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_export_invalid_format_rejected(client, auth_headers, test_class):
    response = client.get(
        f"/api/v1/reports/export?format=xml&class_id={test_class.id}", headers=auth_headers
    )
    assert response.status_code == 422