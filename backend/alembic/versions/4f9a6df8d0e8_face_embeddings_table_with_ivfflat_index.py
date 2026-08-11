"""face_embeddings table with ivfflat index

Revision ID: 4f9a6df8d0e8
Revises: bb3b495f8090
Create Date: 2026-08-05 09:17:02.577204

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = '4f9a6df8d0e8'
down_revision: Union[str, None] = 'bb3b495f8090'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "face_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("embedding", pgvector.sqlalchemy.Vector(512), nullable=False),
        sa.Column("source_photo_url", sa.String(length=500), nullable=True),
        sa.Column("det_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_index("ix_face_embeddings_student_id", "face_embeddings", ["student_id"])

    # Approximate nearest-neighbor index for fast cosine-similarity search
    # (used in Phase 4's face_matcher). `lists = 100` is a reasonable default
    # for a few thousand rows — we'll tune it in Phase 10 once real data exists.
    # Note: ivfflat quality improves after the table has real data and gets
    # ANALYZEd; it's fine to create on an empty table now.
    op.execute(
        """
        CREATE INDEX ix_face_embeddings_embedding_cosine
        ON face_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_face_embeddings_embedding_cosine")
    op.drop_index("ix_face_embeddings_student_id", table_name="face_embeddings")
    op.drop_table("face_embeddings")