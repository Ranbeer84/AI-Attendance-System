from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "attendance_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,  # job results kept for 1 hour
)

celery_app.autodiscover_tasks(["app.workers"])