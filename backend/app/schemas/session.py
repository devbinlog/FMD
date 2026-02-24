import uuid
from datetime import datetime

from pydantic import BaseModel


class SessionResponse(BaseModel):
    session_id: uuid.UUID


class HistoryResultItem(BaseModel):
    title: str
    image_url: str | None = None
    product_url: str | None = None
    score_overall: float


class HistoryItem(BaseModel):
    design_id: uuid.UUID
    text_prompt: str | None
    category_hint: str | None
    input_mode: str
    created_at: datetime
    ai_image_url: str | None = None
    keywords: list[str] = []
    dominant_color: str | None = None
    top_results: list[HistoryResultItem] = []


class HistoryResponse(BaseModel):
    session_id: uuid.UUID
    items: list[HistoryItem]
    total: int
