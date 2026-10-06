import base64
import uuid

import cv2
import numpy as np

from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.ai.pipeline import process_group_photo_image
from app.services.storage_service import storage_service


@celery_app.task(name="process_group_photo", bind=True)
def process_group_photo(self, image_b64: str, content_type: str, class_id: str | None):
    """
    Runs in the Celery worker process, NOT the FastAPI process.
    Opens its own DB session since Celery workers don't have access to
    FastAPI's request-scoped dependency injection.
    """
    db = SessionLocal()
    try:
        image_bytes = base64.b64decode(image_b64)
        array = np.frombuffer(image_bytes, dtype=np.uint8)
        image_bgr = cv2.imdecode(array, cv2.IMREAD_COLOR)

        if image_bgr is None:
            return {"error": "Could not decode image"}

        class_uuid = uuid.UUID(class_id) if class_id else None

        results = process_group_photo_image(db, image_bgr, class_id=class_uuid)

        source_photo_url = None
        try:
            source_photo_url = storage_service.upload_file(
                image_bytes, folder="group-photos", content_type=content_type
            )
        except Exception:
            source_photo_url = None  # storage failure shouldn't fail the whole job

        return {
            "source_photo_url": source_photo_url,
            "class_id": class_id,
            "total_faces_detected": len(results),
            "faces": results,
        }
    finally:
        db.close()