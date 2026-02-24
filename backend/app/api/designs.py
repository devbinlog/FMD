import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.design import Design
from app.models.job import Job
from app.models.session import Session
from app.schemas.design import DesignCreate, DesignResponse, ProcessResponse
from app.worker.processor import process_job_inline

router = APIRouter()


@router.post("/designs", response_model=DesignResponse)
async def create_design(body: DesignCreate, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    design = Design(
        session_id=body.session_id,
        input_mode=body.input_mode,
        category_hint=body.category_hint,
        text_prompt=body.text_prompt,
        status="created",
    )
    if body.canvas_data:
        design.input_image_url = body.canvas_data

    db.add(design)
    await db.commit()
    await db.refresh(design)
    return DesignResponse(design_id=design.id, status=design.status)


@router.post("/designs/{design_id}/process", response_model=ProcessResponse)
async def process_design(design_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    design = await db.get(Design, design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    # Check for existing queued/running job (idempotent)
    stmt = select(Job).where(
        Job.design_id == str(design_id),
        Job.job_type == "process",
        Job.status.in_(["queued", "running"]),
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return ProcessResponse(job_id=existing.id, status=existing.status)

    # Also check for already completed job
    stmt_done = select(Job).where(
        Job.design_id == str(design_id),
        Job.job_type == "process",
        Job.status == "done",
    )
    done_job = (await db.execute(stmt_done)).scalar_one_or_none()
    if done_job:
        return ProcessResponse(job_id=done_job.id, status=done_job.status)

    job = Job(design_id=str(design_id), job_type="process", status="queued")
    db.add(job)
    design.status = "processing"
    await db.commit()
    await db.refresh(job)

    # Process inline (no separate worker needed)
    asyncio.create_task(process_job_inline(str(job.id)))

    return ProcessResponse(job_id=job.id, status=job.status)
