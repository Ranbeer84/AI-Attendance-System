"""
One-off script to seed a teacher into the DEV database (not the test DB).
Run once, then delete or leave it out of git.

Usage:
    cd backend
    python seed_teacher.py
"""
import uuid

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.teacher import Teacher

EMAIL = "teacher@example.com"
PASSWORD = "StrongPass123"

db = SessionLocal()

existing = db.query(Teacher).filter(Teacher.email == EMAIL).first()
if existing:
    print(f"Teacher already exists: {EMAIL}")
else:
    teacher = Teacher(
        id=uuid.uuid4(),
        name="Test Teacher",
        email=EMAIL,
        hashed_password=hash_password(PASSWORD),
        is_active=True,
    )
    db.add(teacher)
    db.commit()
    print(f"Created teacher: {EMAIL} / {PASSWORD}")

db.close()