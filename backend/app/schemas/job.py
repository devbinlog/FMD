import uuid

from pydantic import BaseModel


class StyleVariation(BaseModel):
    style: str        # "minimal" | "modern" | "vintage" | "bold"
    image_url: str


class JobStatus(BaseModel):
    job_id: uuid.UUID
    status: str
    progress: float
    error_code: str | None = None
    ai_image_url: str | None = None          # kept for backward compat
    style_variations: list[StyleVariation] | None = None
    keywords: list[str] | None = None
    dominant_color: str | None = None
