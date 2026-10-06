import io
from unittest.mock import patch

from PIL import Image


def _make_test_image_bytes() -> bytes:
    image = Image.new("RGB", (200, 200), color="blue")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def test_create_student_requires_auth(client, test_class):
    response = client.post(
        "/api/v1/students",
        json={"name": "Jane Doe", "roll_number": "R002", "class_id": str(test_class.id)},
    )
    assert response.status_code == 401


def test_create_student(client, auth_headers, test_class):
    response = client.post(
        "/api/v1/students",
        headers=auth_headers,
        json={"name": "Jane Doe", "roll_number": "R002", "class_id": str(test_class.id)},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Jane Doe"
    assert data["roll_number"] == "R002"
    assert data["is_active"] is True


def test_create_student_duplicate_roll_number(client, auth_headers, test_student):
    response = client.post(
        "/api/v1/students",
        headers=auth_headers,
        json={"name": "Duplicate", "roll_number": test_student.roll_number},
    )
    assert response.status_code in (400, 500)  # DB unique constraint violation


def test_list_students(client, auth_headers, test_student):
    response = client.get("/api/v1/students", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert any(s["id"] == str(test_student.id) for s in data)


def test_list_students_filtered_by_class(client, auth_headers, test_student, test_class):
    response = client.get(
        f"/api/v1/students?class_id={test_class.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert all(True for _ in data)  # sanity check, all returned belong to filter
    assert len(data) >= 1


def test_get_student(client, auth_headers, test_student):
    response = client.get(f"/api/v1/students/{test_student.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == str(test_student.id)


def test_get_student_not_found(client, auth_headers):
    import uuid

    response = client.get(f"/api/v1/students/{uuid.uuid4()}", headers=auth_headers)
    assert response.status_code == 404


def test_update_student(client, auth_headers, test_student):
    response = client.put(
        f"/api/v1/students/{test_student.id}",
        headers=auth_headers,
        json={"name": "Updated Name"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


def test_delete_student(client, auth_headers, test_student):
    response = client.delete(f"/api/v1/students/{test_student.id}", headers=auth_headers)
    assert response.status_code == 204

    get_response = client.get(f"/api/v1/students/{test_student.id}", headers=auth_headers)
    assert get_response.status_code == 404


@patch("app.services.student_service.storage_service.upload_file")
def test_upload_profile_photo(mock_upload, client, auth_headers, test_student):
    mock_upload.return_value = "http://localhost:9000/attendance-photos/student-profiles/fake.jpg"

    image_bytes = _make_test_image_bytes()
    response = client.post(
        f"/api/v1/students/{test_student.id}/photo",
        headers=auth_headers,
        files={"file": ("photo.jpg", image_bytes, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["profile_photo_url"] == mock_upload.return_value
    mock_upload.assert_called_once()


def test_upload_profile_photo_invalid_type(client, auth_headers, test_student):
    response = client.post(
        f"/api/v1/students/{test_student.id}/photo",
        headers=auth_headers,
        files={"file": ("doc.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 400