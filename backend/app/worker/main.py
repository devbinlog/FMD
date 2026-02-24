"""Background worker process.

Run with: python -m app.worker.main
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session
from app.core.redis import (
    acquire_lock,
    cache_set,
    dequeue_job,
    job_key,
    lock_key,
    release_lock,
)
from app.models.design import Design
from app.models.design_profile import DesignProfile
from app.models.job import Job
from app.services.profile_generator import generate_profile

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fmd.worker")


async def process_job(job_id_str: str) -> None:
    job_id = uuid.UUID(job_id_str)

    async with async_session() as db:
        job = await db.get(Job, job_id)
        if not job:
            logger.warning("Job %s not found, skipping", job_id)
            return

        design = await db.get(Design, job.design_id)
        if not design:
            logger.warning("Design %s not found for job %s", job.design_id, job_id)
            return

        # Acquire lock to prevent duplicate processing
        lk = lock_key(str(design.id))
        if not await acquire_lock(lk):
            logger.info("Job %s already being processed (lock held)", job_id)
            return

        try:
            # Update status → running
            job.status = "running"
            job.progress = 0.1
            await db.commit()
            await cache_set(job_key(job_id_str), {"status": "running", "progress": 0.1})

            # Generate DesignProfile
            logger.info("Generating profile for design %s", design.id)
            profile_data = generate_profile(design.text_prompt, design.category_hint)

            # Check if profile already exists (idempotent)
            stmt = select(DesignProfile).where(DesignProfile.design_id == design.id)
            existing_profile = (await db.execute(stmt)).scalar_one_or_none()

            if not existing_profile:
                dp = DesignProfile(
                    design_id=design.id,
                    profile_hash=profile_data["profile_hash"],
                    profile=profile_data["profile"],
                    keywords=profile_data["keywords"],
                    negative_keywords=profile_data["negative_keywords"],
                    dominant_color=profile_data["dominant_color"],
                )
                db.add(dp)

            job.progress = 1.0
            job.status = "done"
            job.finished_at = datetime.now(timezone.utc)
            design.status = "processed"
            await db.commit()

            await cache_set(job_key(job_id_str), {"status": "done", "progress": 1.0})
            logger.info("Job %s completed successfully", job_id)

        except Exception as e:
            logger.error("Job %s failed: %s", job_id, e)
            job.status = "failed"
            job.error_code = type(e).__name__
            job.finished_at = datetime.now(timezone.utc)
            design.status = "failed"
            await db.commit()
            await cache_set(
                job_key(job_id_str),
                {"status": "failed", "error_code": type(e).__name__},
            )
        finally:
            await release_lock(lk)


async def worker_loop() -> None:
    logger.info("FMD Worker started (concurrency=%d)", settings.WORKER_CONCURRENCY)
    while True:
        job_id = await dequeue_job(timeout=5)
        if job_id:
            logger.info("Dequeued job: %s", job_id)
            await process_job(job_id)


def main() -> None:
    asyncio.run(worker_loop())


if __name__ == "__main__":
    main()
