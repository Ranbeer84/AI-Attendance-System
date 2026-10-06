import uuid
from datetime import date, timedelta

from app.models.attendance import AttendanceRecord
from app.models.student import Student


def test_confirm_attendance_creates_records(client, auth_headers, test_class, test_subject, test_student, db_session):
    response = client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "subject_id": str(test_subject.id),
            "records": [
                {"student_id": str(test_student.id), "status": "present", "confidence": 0.91},
            ],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 1
    assert data["records"][0]["status"] == "present"
    assert data["records"][0]["confidence"] == 0.91

    stored = db_session.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == test_student.id
    ).all()
    assert len(stored) == 1
    assert stored[0].marked_by_teacher_id is not None


def test_confirm_attendance_defaults_to_today(client, auth_headers, test_class, test_student):
    response = client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "records": [{"student_id": str(test_student.id), "status": "present"}],
        },
    )

    assert response.status_code == 200
    assert response.json()["date"] == date.today().isoformat()


def test_confirm_attendance_manual_correction(client, auth_headers, test_class, test_student):
    """Simulates the real flow: AI marks someone 'present' with confidence,
    teacher corrects it to 'absent' before confirming -- and confirming a
    second time for the same day updates the record instead of duplicating it."""
    first = client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "records": [{"student_id": str(test_student.id), "status": "present", "confidence": 0.72}],
        },
    )
    assert first.status_code == 200
    first_record_id = first.json()["records"][0]["id"]

    corrected = client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "records": [{"student_id": str(test_student.id), "status": "absent", "confidence": None}],
        },
    )
    assert corrected.status_code == 200
    data = corrected.json()
    assert data["records"][0]["status"] == "absent"
    assert data["records"][0]["confidence"] is None
    # same underlying row was updated, not duplicated
    assert data["records"][0]["id"] == first_record_id


def test_confirm_attendance_same_student_different_subjects_same_day(
    client, auth_headers, test_class, test_subject, test_student, db_session,
):
    """Same student, same day, but different subjects should create
    separate records (e.g. marked present for Math period, absent for
    Science period on the same day)."""
    from app.models.subject import Subject

    other_subject = Subject(id=uuid.uuid4(), name="Science", code="SCI101")
    db_session.add(other_subject)
    db_session.commit()

    client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "subject_id": str(test_subject.id),
            "records": [{"student_id": str(test_student.id), "status": "present"}],
        },
    )
    client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "subject_id": str(other_subject.id),
            "records": [{"student_id": str(test_student.id), "status": "absent"}],
        },
    )

    stored = db_session.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == test_student.id
    ).all()
    assert len(stored) == 2
    statuses = {r.status for r in stored}
    assert statuses == {"present", "absent"}


def test_confirm_attendance_unknown_student_rejected(client, auth_headers, test_class):
    response = client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "records": [{"student_id": str(uuid.uuid4()), "status": "present"}],
        },
    )
    assert response.status_code == 400


def test_confirm_attendance_empty_records_rejected(client, auth_headers, test_class):
    response = client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={"class_id": str(test_class.id), "records": []},
    )
    assert response.status_code == 422  # pydantic validation error


def test_confirm_attendance_requires_auth(client, test_class, test_student):
    response = client.post(
        "/api/v1/attendance/confirm",
        json={
            "class_id": str(test_class.id),
            "records": [{"student_id": str(test_student.id), "status": "present"}],
        },
    )
    assert response.status_code == 401


def test_confirm_attendance_multiple_students(client, auth_headers, test_class, db_session):
    student_a = Student(id=uuid.uuid4(), name="A", roll_number="M001", class_id=test_class.id)
    student_b = Student(id=uuid.uuid4(), name="B", roll_number="M002", class_id=test_class.id)
    db_session.add_all([student_a, student_b])
    db_session.commit()

    response = client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "records": [
                {"student_id": str(student_a.id), "status": "present", "confidence": 0.88},
                {"student_id": str(student_b.id), "status": "absent"},
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["total_records"] == 2


def test_attendance_history_filters_by_class(client, auth_headers, test_class, test_student):
    client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "records": [{"student_id": str(test_student.id), "status": "present"}],
        },
    )

    response = client.get(
        f"/api/v1/attendance/history?class_id={test_class.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(r["class_id"] == str(test_class.id) for r in data)


def test_attendance_history_filters_by_date_range(client, auth_headers, test_class, test_student):
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    today = date.today().isoformat()

    client.post(
        "/api/v1/attendance/confirm",
        headers=auth_headers,
        json={
            "class_id": str(test_class.id),
            "date": today,
            "records": [{"student_id": str(test_student.id), "status": "present"}],
        },
    )

    response = client.get(
        f"/api/v1/attendance/history?date_from={yesterday}&date_to={today}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert len(response.json()) >= 1

    response_none = client.get(
        f"/api/v1/attendance/history?date_from={yesterday}&date_to={yesterday}",
        headers=auth_headers,
    )
    assert response_none.status_code == 200
    assert all(r["student_id"] != str(test_student.id) or r["date"] != today for r in response_none.json())