from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "AI Attendance System"
    API_V1_PREFIX: str = "/api/v1"

    # Storage (S3 / R2)
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY_ID: str = "changeme"
    S3_SECRET_ACCESS_KEY: str = "changeme"
    S3_BUCKET_NAME: str = "attendance-photos"
    S3_REGION: str = "auto"
    S3_PUBLIC_URL_BASE: str = "http://localhost:9000/attendance-photos"
    MAX_UPLOAD_SIZE_MB: int = 5

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Face matching
    FACE_MATCH_SIMILARITY_THRESHOLD: float = 0.45  # tuned further in Phase 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()