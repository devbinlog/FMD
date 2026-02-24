import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import GUID, JSONType, StringArray


class DesignProfile(Base):
    __tablename__ = "design_profiles"

    id: Mapped[str] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    design_id: Mapped[str] = mapped_column(GUID(), ForeignKey("designs.id"), unique=True)
    profile_hash: Mapped[str] = mapped_column(String(64), unique=True)
    profile: Mapped[dict] = mapped_column(JSONType(), default=dict)
    keywords: Mapped[list] = mapped_column(StringArray(), default=list)
    negative_keywords: Mapped[list] = mapped_column(StringArray(), default=list)
    dominant_color: Mapped[str | None] = mapped_column(String(7))
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    design = relationship("Design", back_populates="profile")
    search_runs = relationship("SearchRun", back_populates="profile")
