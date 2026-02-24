import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import String, Text, Float, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import GUID, StringArray


class SearchResult(Base):
    __tablename__ = "search_results"

    id: Mapped[str] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    search_run_id: Mapped[str] = mapped_column(GUID(), ForeignKey("search_runs.id"))
    title: Mapped[str] = mapped_column(String(255))
    image_url: Mapped[str | None] = mapped_column(Text)
    product_url: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    score_overall: Mapped[float] = mapped_column(Float, default=0.0)
    score_embedding: Mapped[float] = mapped_column(Float, default=0.0)
    score_color: Mapped[float] = mapped_column(Float, default=0.0)
    score_keyword: Mapped[float] = mapped_column(Float, default=0.0)
    explanation: Mapped[list] = mapped_column(StringArray(), default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    search_run = relationship("SearchRun", back_populates="results")
