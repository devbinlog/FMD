import uuid

from pydantic import BaseModel


class SearchRequest(BaseModel):
    design_id: uuid.UUID
    providers: list[str] = ["mock", "crawl"]
    limit: int = 20


class SearchResultItem(BaseModel):
    title: str
    image_url: str | None = None
    product_url: str | None = None
    price: float | None = None
    score_overall: float
    score_keyword: float
    score_color: float
    score_embedding: float
    explanation: list[str]


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
