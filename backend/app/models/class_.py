import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func, Table, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

# Many-to-many link between classes and subjects
class_subjects = Table(
    "class_subjects",
    Base.metadata,
    Column("class_id", UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
)


class Class(Base):
    __tablename__ = "classes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(60), nullable=False)  # e.g. "Grade 10"
    section: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g. "A"
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    students: Mapped[list["Student"]] = relationship(
        back_populates="class_", cascade="all, delete-orphan"
    )
    subjects: Mapped[list["Subject"]] = relationship(
        secondary=class_subjects, back_populates="classes"
    )