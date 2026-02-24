import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import GUID, JSONType


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    design_id: Mapped[str] = mapped_column(GUID(), ForeignKey("designs.id"))
    job_type: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="queued")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    result: Mapped[dict | None] = mapped_column(JSONType())
    error_code: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)

    design = relationship("Design", back_populates="jobs")
