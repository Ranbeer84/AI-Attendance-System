import uuid

from sqlalchemy.orm import Session

from app.models.face_embedding import FaceEmbedding
from app.models.student import Student
from app.core.config import settings


class FaceMatch:
    def __init__(self, student_id: uuid.UUID, similarity: float, matched_embedding_id: uuid.UUID):
        self.student_id = student_id
        self.similarity = similarity
        self.matched_embedding_id = matched_embedding_id


def find_best_match(
    db: Session,
    query_embedding: list[float],
    class_id: uuid.UUID | None = None,
    threshold: float | None = None,
) -> FaceMatch | None:
    """
    Finds the closest stored face embedding to the given query embedding
    using pgvector cosine distance, and returns the owning student if the
    similarity clears the configured threshold.

    Since each student can have 15-30 stored embeddings, this simply finds
    the single nearest neighbor across ALL embeddings (optionally scoped to
    one class) rather than averaging per-student -- the nearest photo match
    is what determines identity here.
    """
    if threshold is None:
        threshold = settings.FACE_MATCH_SIMILARITY_THRESHOLD

    distance_expr = FaceEmbedding.embedding.cosine_distance(query_embedding)

    query = db.query(
        FaceEmbedding.id,
        FaceEmbedding.student_id,
        distance_expr.label("distance"),
    )

    if class_id is not None:
        query = query.join(Student, Student.id == FaceEmbedding.student_id).filter(
            Student.class_id == class_id
        )

    result = query.order_by(distance_expr).first()

    if result is None:
        return None

    embedding_id, student_id, distance = result
    similarity = 1 - float(distance)

    if similarity < threshold:
        return None

    return FaceMatch(student_id=student_id, similarity=similarity, matched_embedding_id=embedding_id)