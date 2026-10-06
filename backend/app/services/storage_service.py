import uuid

import boto3
from botocore.client import Config

from app.core.config import settings


class StorageService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT_URL,
                aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                region_name=settings.S3_REGION,
                config=Config(signature_version="s3v4"),
            )
        return self._client

    def upload_file(self, file_bytes: bytes, folder: str, content_type: str) -> str:
        extension = "jpg" if content_type == "image/jpeg" else content_type.split("/")[-1]
        key = f"{folder}/{uuid.uuid4()}.{extension}"

        self.client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return f"{settings.S3_PUBLIC_URL_BASE.rstrip('/')}/{key}"

    def delete_file_by_url(self, file_url: str) -> None:
        prefix = settings.S3_PUBLIC_URL_BASE.rstrip("/") + "/"
        if not file_url.startswith(prefix):
            return
        key = file_url[len(prefix):]
        try:
            self.client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        except Exception:
            # Non-fatal: don't block the request if cleanup of the old file fails
            pass


storage_service = StorageService()