import io
import uuid
from unittest.mock import patch, MagicMock

import numpy as np
from PIL import Image

from app.models.face_embedding import FaceEmbedding
from app.models.student import Student
from app.ai.face_matcher import find_best_match


def _make_test_image_bytes() -> bytes:
    image = Image.new("RGB", (200, 200), color="green")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def _fake_embedding(seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    vector = rng.random(512).astype(np.float32)
    return vector / np.linalg.norm(vector)


FAKE_KPS = [[60, 60], [140, 60], [100, 100], [70, 140], [130, 140]]


# --- Phase 3 tests (unchanged) ---

@patch("app.services.student_service.storage_service.upload_file")
@patch("app.services.student_service._get_embedder")
@patch("app.services.student_service._get_detector")
def test_register_face_success(
    mock_get_detector, mock_get_embedder, mock_upload,
    client, auth_headers, test_student, db_session,
):
    mock_upload.return_value = "http://fake-storage/face.jpg"

    mock_detector = MagicMock()
    mock_detector.detect_faces.return_value = [
        {"bbox": [10, 10, 190, 190], "kps": FAKE_KPS, "det_score": 0.99}
    ]
    mock_get_detector.return_value = mock_detector

    mock_embedder = MagicMock()
    mock_embedder.get_embedding.return_value = _fake_embedding(seed=1)
    mock_get_embedder.return_value = mock_embedder

    response = client.post(
        f"/api/v1/students/{test_student.id}/register-face",
        headers=auth_headers,
        files=[("files", ("face1.jpg", _make_test_image_bytes(), "image/jpeg"))],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_uploaded"] == 1
    assert data["successful"] == 1
    assert data["failed"] == 0
    assert data["results"][0]["status"] == "success"

    stored = db_session.query(FaceEmbedding).filter(FaceEmbedding.student_id == test_student.id).all()
    assert len(stored) == 1
    assert len(stored[0].embedding) == 512


@patch("app.services.student_service._get_embedder")
@patch("app.services.student_service._get_detector")
def test_register_face_no_face_detected(mock_get_detector, mock_get_embedder, client, auth_headers, test_student):
    mock_detector = MagicMock()
    mock_detector.detect_faces.return_value = []
    mock_get_detector.return_value = mock_detector
    mock_get_embedder.return_value = MagicMock()

    response = client.post(
        f"/api/v1/students/{test_student.id}/register-face",
        headers=auth_headers,
        files=[("files", ("empty.jpg", _make_test_image_bytes(), "image/jpeg"))],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["successful"] == 0
    assert data["failed"] == 1
    assert data["results"][0]["reason"] == "No face detected"


@patch("app.services.student_service._get_embedder")
@patch("app.services.student_service._get_detector")
def test_register_face_multiple_faces_rejected(mock_get_detector, mock_get_embedder, client, auth_headers, test_student):
    mock_detector = MagicMock()
    mock_detector.detect_faces.return_value = [
        {"bbox": [0, 0, 50, 50], "kps": FAKE_KPS, "det_score": 0.9},
        {"bbox": [60, 60, 120, 120], "kps": FAKE_KPS, "det_score": 0.85},
    ]
    mock_get_detector.return_value = mock_detector
    mock_get_embedder.return_value = MagicMock()

    response = client.post(
        f"/api/v1/students/{test_student.id}/register-face",
        headers=auth_headers,
        files=[("files", ("group.jpg", _make_test_image_bytes(), "image/jpeg"))],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["successful"] == 0
    assert "Multiple faces" in data["results"][0]["reason"]


def test_register_face_student_not_found(client, auth_headers):
    response = client.post(
        f"/api/v1/students/{uuid.uuid4()}/register-face",
        headers=auth_headers,
        files=[("files", ("face.jpg", _make_test_image_bytes(), "image/jpeg"))],
    )
    assert response.status_code == 404


@patch("app.services.student_service.storage_service.upload_file")
@patch("app.services.student_service._get_embedder")
@patch("app.services.student_service._get_detector")
def test_register_face_batch_partial_success(
    mock_get_detector, mock_get_embedder, mock_upload,
    client, auth_headers, test_student,
):
    mock_upload.return_value = "http://fake-storage/face.jpg"

    mock_detector = MagicMock()
    mock_detector.detect_faces.side_effect = [
        [{"bbox": [10, 10, 190, 190], "kps": FAKE_KPS, "det_score": 0.99}],
        [],
    ]
    mock_get_detector.return_value = mock_detector

    mock_embedder = MagicMock()
    mock_embedder.get_embedding.return_value = _fake_embedding(seed=2)
    mock_get_embedder.return_value = mock_embedder

    response = client.post(
        f"/api/v1/students/{test_student.id}/register-face",
        headers=auth_headers,
        files=[
            ("files", ("good.jpg", _make_test_image_bytes(), "image/jpeg")),
            ("files", ("bad.jpg", _make_test_image_bytes(), "image/jpeg")),
        ],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_uploaded"] == 2
    assert data["successful"] == 1
    assert data["failed"] == 1


def test_embedding_cosine_similarity_sanity():
    rng = np.random.default_rng(42)
    base = rng.random(512).astype(np.float32)
    base /= np.linalg.norm(base)

    same_person = base + rng.normal(0, 0.01, 512).astype(np.float32)
    same_person /= np.linalg.norm(same_person)

    different_person = rng.random(512).astype(np.float32)
    different_person /= np.linalg.norm(different_person)

    sim_same = float(np.dot(base, same_person))
    sim_different = float(np.dot(base, different_person))

    assert sim_same > 0.95
    assert sim_different < sim_same
    assert sim_same - sim_different > 0.3


# --- Phase 4 tests: face_matcher against a real pgvector-backed DB ---

def _insert_embedding(db_session, student_id, base_vector, jitter_seed):
    rng = np.random.default_rng(jitter_seed)
    vector = base_vector + rng.normal(0, 0.01, 512).astype(np.float32)
    vector = vector / np.linalg.norm(vector)
    row = FaceEmbedding(student_id=student_id, embedding=vector.tolist(), det_score=0.95)
    db_session.add(row)
    db_session.commit()
    return vector


def test_find_best_match_returns_correct_student(db_session, test_class):
    rng = np.random.default_rng(100)

    student_a = Student(id=uuid.uuid4(), name="Alice", roll_number="A100", class_id=test_class.id)
    student_b = Student(id=uuid.uuid4(), name="Bob", roll_number="A101", class_id=test_class.id)
    db_session.add_all([student_a, student_b])
    db_session.commit()

    base_a = rng.random(512).astype(np.float32)
    base_a /= np.linalg.norm(base_a)
    base_b = rng.random(512).astype(np.float32)
    base_b /= np.linalg.norm(base_b)

    # each student gets a few embeddings clustered around their own base vector
    for i in range(3):
        _insert_embedding(db_session, student_a.id, base_a, jitter_seed=200 + i)
    for i in range(3):
        _insert_embedding(db_session, student_b.id, base_b, jitter_seed=300 + i)

    # query vector close to student A's cluster
    query_rng = np.random.default_rng(201)
    query_vector = base_a + query_rng.normal(0, 0.01, 512).astype(np.float32)
    query_vector = (query_vector / np.linalg.norm(query_vector)).tolist()

    match = find_best_match(db_session, query_vector, threshold=0.5)

    assert match is not None
    assert match.student_id == student_a.id
    assert match.similarity > 0.9


def test_find_best_match_returns_none_below_threshold(db_session, test_class):
    rng = np.random.default_rng(400)

    student = Student(id=uuid.uuid4(), name="Charlie", roll_number="A102", class_id=test_class.id)
    db_session.add(student)
    db_session.commit()

    base = rng.random(512).astype(np.float32)
    base /= np.linalg.norm(base)
    _insert_embedding(db_session, student.id, base, jitter_seed=401)

    # a totally unrelated random query vector should not match
    unrelated = rng.random(512).astype(np.float32)
    unrelated /= np.linalg.norm(unrelated)

    match = find_best_match(db_session, unrelated.tolist(), threshold=0.5)
    assert match is None


def test_find_best_match_scoped_to_class(db_session, test_class):
    """A matching embedding belonging to a student in a DIFFERENT class
    should be ignored when class_id is provided."""
    from app.models.class_ import Class

    other_class = Class(id=uuid.uuid4(), name="Grade 11", section="B")
    db_session.add(other_class)
    db_session.commit()

    rng = np.random.default_rng(500)
    base = rng.random(512).astype(np.float32)
    base /= np.linalg.norm(base)

    student_other_class = Student(
        id=uuid.uuid4(), name="Dana", roll_number="B200", class_id=other_class.id
    )
    db_session.add(student_other_class)
    db_session.commit()
    _insert_embedding(db_session, student_other_class.id, base, jitter_seed=501)

    query_vector = base.tolist()

    # searching within test_class should find nothing, even though a near-identical
    # embedding exists for a student in a different class
    match = find_best_match(db_session, query_vector, class_id=test_class.id, threshold=0.5)
    assert match is None

    # searching without class scoping (or scoped to the correct class) should find it
    match_unscoped = find_best_match(db_session, query_vector, threshold=0.5)
    assert match_unscoped is not None
    assert match_unscoped.student_id == student_other_class.id


# --- Phase 4 tests: full group-photo pipeline with mocked detector/embedder ---

@patch("app.ai.pipeline._get_embedder")
@patch("app.ai.pipeline._get_detector")
def test_process_group_photo_image_multi_face(mock_get_detector, mock_get_embedder, db_session, test_class):
    from app.ai.pipeline import process_group_photo_image

    rng = np.random.default_rng(600)

    student = Student(id=uuid.uuid4(), name="Eve", roll_number="C300", class_id=test_class.id)
    db_session.add(student)
    db_session.commit()

    base = rng.random(512).astype(np.float32)
    base /= np.linalg.norm(base)
    _insert_embedding(db_session, student.id, base, jitter_seed=601)

    mock_detector = MagicMock()
    mock_detector.detect_faces.return_value = [
        {"bbox": [0, 0, 50, 50], "kps": FAKE_KPS, "det_score": 0.95},   # will match Eve
        {"bbox": [60, 0, 110, 50], "kps": FAKE_KPS, "det_score": 0.90},  # will be unknown
    ]
    mock_get_detector.return_value = mock_detector

    known_embedding = base + rng.normal(0, 0.01, 512).astype(np.float32)
    known_embedding /= np.linalg.norm(known_embedding)

    unknown_embedding = rng.random(512).astype(np.float32)
    unknown_embedding /= np.linalg.norm(unknown_embedding)

    mock_embedder = MagicMock()
    mock_embedder.get_embedding.side_effect = [known_embedding, unknown_embedding]
    mock_get_embedder.return_value = mock_embedder

    fake_image = np.zeros((200, 200, 3), dtype=np.uint8)
    results = process_group_photo_image(db_session, fake_image, class_id=test_class.id)

    assert len(results) == 2
    assert results[0]["status"] == "matched"
    assert results[0]["student_id"] == str(student.id)
    assert results[0]["student_name"] == "Eve"
    assert results[0]["confidence"] > 0.5

    assert results[1]["status"] == "unknown"
    assert results[1]["student_id"] is None


# --- Phase 4 tests: attendance API endpoints (Celery mocked, no real worker needed) ---

@patch("app.api.v1.attendance.process_group_photo")
def test_upload_photo_returns_job_id(mock_task, client, auth_headers):
    mock_async_result = MagicMock()
    mock_async_result.id = "fake-job-id-123"
    mock_task.delay.return_value = mock_async_result

    response = client.post(
        "/api/v1/attendance/upload-photo",
        headers=auth_headers,
        files={"file": ("group.jpg", _make_test_image_bytes(), "image/jpeg")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "fake-job-id-123"
    assert data["status"] == "queued"
    mock_task.delay.assert_called_once()


def test_upload_photo_requires_auth(client):
    response = client.post(
        "/api/v1/attendance/upload-photo",
        files={"file": ("group.jpg", _make_test_image_bytes(), "image/jpeg")},
    )
    assert response.status_code == 401


def test_upload_photo_rejects_invalid_type(client, auth_headers):
    response = client.post(
        "/api/v1/attendance/upload-photo",
        headers=auth_headers,
        files={"file": ("doc.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 400


@patch("app.api.v1.attendance.AsyncResult")
def test_job_status_pending(mock_async_result_cls, client, auth_headers):
    mock_result = MagicMock()
    mock_result.state = "PENDING"
    mock_async_result_cls.return_value = mock_result

    response = client.get("/api/v1/attendance/status/some-job-id", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "pending"


@patch("app.api.v1.attendance.AsyncResult")
def test_job_status_completed(mock_async_result_cls, client, auth_headers):
    mock_result = MagicMock()
    mock_result.state = "SUCCESS"
    mock_result.result = {
        "source_photo_url": "http://fake-storage/group.jpg",
        "class_id": None,
        "total_faces_detected": 1,
        "faces": [
            {
                "bbox": [1, 2, 3, 4],
                "det_score": 0.9,
                "status": "matched",
                "student_id": str(uuid.uuid4()),
                "student_name": "Test",
                "confidence": 0.87,
            }
        ],
    }
    mock_async_result_cls.return_value = mock_result

    response = client.get("/api/v1/attendance/status/some-job-id", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["result"]["total_faces_detected"] == 1


@patch("app.api.v1.attendance.AsyncResult")
def test_job_status_failed(mock_async_result_cls, client, auth_headers):
    mock_result = MagicMock()
    mock_result.state = "FAILURE"
    mock_result.info = Exception("something broke")
    mock_async_result_cls.return_value = mock_result

    response = client.get("/api/v1/attendance/status/some-job-id", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "failed"
    assert "something broke" in data["error"]