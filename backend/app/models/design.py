import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import GUID


class Design(Base):
    __tablename__ = "designs"

    id: Mapped[str] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[str] = mapped_column(GUID(), ForeignKey("sessions.id"))
    input_mode: Mapped[str] = mapped_column(String(10))
    category_hint: Mapped[str | None] = mapped_column(String(50))
    text_prompt: Mapped[str | None] = mapped_column(Text)
    input_image_url: Mapped[str | None] = mapped_column(Text)
    input_image_sha256: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), default="created")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    session = relationship("Session", back_populates="designs")
    jobs = relationship("Job", back_populates="design")
    profile = relationship("DesignProfile", back_populates="design", uselist=False)
