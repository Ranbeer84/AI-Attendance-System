import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import hash_password
from app.models.teacher import Teacher
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.student import Student

TEST_DATABASE_URL = settings.DATABASE_URL.rsplit("/", 1)[0] + "/attendance_test_db"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    from sqlalchemy import text

    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def test_teacher(db_session):
    teacher = Teacher(
        id=uuid.uuid4(),
        name="Test Teacher",
        email="teacher@example.com",
        hashed_password=hash_password("StrongPass123"),
        is_active=True,
    )
    db_session.add(teacher)
    db_session.commit()
    db_session.refresh(teacher)
    return teacher


@pytest.fixture()
def auth_headers(client, test_teacher):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "teacher@example.com", "password": "StrongPass123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def test_class(db_session):
    class_obj = Class(id=uuid.uuid4(), name="Grade 10", section="A")
    db_session.add(class_obj)
    db_session.commit()
    db_session.refresh(class_obj)
    return class_obj


@pytest.fixture()
def test_subject(db_session):
    subject = Subject(id=uuid.uuid4(), name="Mathematics", code="MATH101")
    db_session.add(subject)
    db_session.commit()
    db_session.refresh(subject)
    return subject


@pytest.fixture()
def test_student(db_session, test_class):
    student = Student(
        id=uuid.uuid4(),
        name="John Doe",
        roll_number="R001",
        email="john@example.com",
        class_id=test_class.id,
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    return student