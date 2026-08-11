# AI-Powered Attendance System

An attendance management system that marks student attendance automatically from a single group classroom photo, using face detection and recognition (InsightFace + pgvector).

> Status: 🚧 Under active development. See `docs/` for the full project plan, ER diagram, and deployment guide.

## Overview

A teacher uploads one group photo taken during class. The system detects every face, matches each one against registered student face embeddings, and marks recognized students Present. The teacher reviews and corrects results before saving.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Axios, React Router
- **Backend:** FastAPI, SQLAlchemy, Alembic, JWT Auth
- **AI / CV:** InsightFace (RetinaFace + ArcFace), OpenCV, NumPy
- **Database:** PostgreSQL with `pgvector`
- **Async Jobs:** Celery + Redis
- **Storage:** S3-compatible (Cloudflare R2 / AWS S3)
- **Infra:** Docker, Docker Compose

## Project Structure

```
ai-attendance-system/
├── backend/     # FastAPI app, AI pipeline, Celery workers
├── frontend/    # React + TypeScript client
├── docs/        # ER diagram, API docs, deployment guide
└── postman/     # Postman collection for API testing
```

## Getting Started

Setup instructions will be added as each phase of development is completed. See `docs/deployment-guide.md` (coming in a later phase) for full local setup and Docker instructions.

## License

TBD
