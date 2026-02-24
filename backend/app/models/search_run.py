import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import GUID


class SearchRun(Base):
    __tablename__ = "search_runs"

    id: Mapped[str] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[str] = mapped_column(GUID(), ForeignKey("design_profiles.id"))
    provider_id: Mapped[str] = mapped_column(String(50), ForeignKey("providers.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    profile = relationship("DesignProfile", back_populates="search_runs")
    results = relationship("SearchResult", back_populates="search_run")
