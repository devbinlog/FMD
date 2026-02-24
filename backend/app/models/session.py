import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import GUID


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    user_agent: Mapped[str | None] = mapped_column(String(512))
    ip_hash: Mapped[str | None] = mapped_column(String(64))

    designs = relationship("Design", back_populates="session")
