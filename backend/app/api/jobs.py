import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import cache_get, job_key
from app.models.job import Job
from app.schemas.job import JobStatus

router = APIRouter()


@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Try cache first
    cached = await cache_get(job_key(str(job_id)))
    if cached:
        return JobStatus(
            job_id=job_id,
            status=cached["status"],
            progress=cached.get("progress", 0),
            error_code=cached.get("error_code"),
            ai_image_url=cached.get("ai_image_url"),
            keywords=cached.get("keywords"),
            dominant_color=cached.get("dominant_color"),
        )

    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result = job.result or {}
    return JobStatus(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        error_code=job.error_code,
        ai_image_url=result.get("ai_image_url"),
        keywords=result.get("keywords"),
        dominant_color=result.get("dominant_color"),
    )
