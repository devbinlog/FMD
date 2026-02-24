import uuid

from pydantic import BaseModel


class JobStatus(BaseModel):
    job_id: uuid.UUID
    status: str
    progress: float
    error_code: str | None = None
    ai_image_url: str | None = None
    keywords: list[str] | None = None
    dominant_color: str | None = None
