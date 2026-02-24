"""Inline job processor — runs in the same process as the API server."""
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import async_session
from app.core.redis import cache_set, job_key
from app.models.design import Design
from app.models.design_profile import DesignProfile
from app.models.job import Job
from app.services.profile_generator import generate_profile
from app.services.image_generator import generate_design_image
from app.services.embedder import build_query_embedding

logger = logging.getLogger("fmd.worker")


async def process_job_inline(job_id_str: str) -> None:
    """Process a job directly (no queue). Called via asyncio.create_task."""
    job_id = uuid.UUID(job_id_str)

    async with async_session() as db:
        job = await db.get(Job, job_id)
        if not job:
            logger.warning("Job %s not found", job_id)
            return

        design = await db.get(Design, job.design_id)
        if not design:
            logger.warning("Design not found for job %s", job_id)
            return

        try:
            # Update status → running
            job.status = "running"
            job.progress = 0.1
            await db.commit()
            await cache_set(job_key(job_id_str), {"status": "running", "progress": 0.1})

            # Step 1: Generate profile
            logger.info("Generating profile for design %s", design.id)
            profile_data = generate_profile(
                text_prompt=design.text_prompt,
                category=design.category_hint,
                canvas_data=design.input_image_url if design.input_mode == "canvas" else None,
            )

            # Compute keyword embedding for semantic ranking
            embedding_bytes = build_query_embedding(profile_data["keywords"])

            job.progress = 0.4
            await db.commit()
            await cache_set(job_key(job_id_str), {"status": "running", "progress": 0.4})

            # Step 2: Generate AI reference image (Stable Diffusion)
            ai_prompt = design.text_prompt or " ".join(profile_data["keywords"])
            style = (design.category_hint or "design-asset").lower()
            ai_image = await generate_design_image(ai_prompt, style)
            logger.info("AI image generated via %s", ai_image["method"])

            job.progress = 0.7
            await db.commit()
            await cache_set(job_key(job_id_str), {"status": "running", "progress": 0.7})

            # Step 3: Save profile
            # Use design-scoped hash to avoid UNIQUE conflict across designs
            design_scoped_hash = f"{design.id}:{profile_data['profile_hash']}"

            stmt = select(DesignProfile).where(DesignProfile.design_id == str(design.id))
            existing = (await db.execute(stmt)).scalar_one_or_none()

            if existing:
                existing.profile = {
                    **profile_data["profile"],
                    "ai_image_url": ai_image["image_url"],
                    "ai_image_method": ai_image["method"],
                }
                existing.keywords = profile_data["keywords"]
                existing.negative_keywords = profile_data["negative_keywords"]
                existing.dominant_color = profile_data["dominant_color"]
                existing.profile_hash = design_scoped_hash
                existing.embedding = embedding_bytes
            else:
                dp = DesignProfile(
                    design_id=str(design.id),
                    profile_hash=design_scoped_hash,
                    profile={
                        **profile_data["profile"],
                        "ai_image_url": ai_image["image_url"],
                        "ai_image_method": ai_image["method"],
                    },
                    keywords=profile_data["keywords"],
                    negative_keywords=profile_data["negative_keywords"],
                    dominant_color=profile_data["dominant_color"],
                    embedding=embedding_bytes,
                )
                db.add(dp)

            job.progress = 1.0
            job.status = "done"
            job.result = {
                "ai_image_url": ai_image["image_url"],
                "ai_image_method": ai_image["method"],
                "keywords": profile_data["keywords"],
                "dominant_color": profile_data["dominant_color"],
            }
            job.finished_at = datetime.now(timezone.utc)
            design.status = "processed"
            await db.commit()

            await cache_set(job_key(job_id_str), {
                "status": "done",
                "progress": 1.0,
                "ai_image_url": ai_image["image_url"],
                "keywords": profile_data["keywords"],
                "dominant_color": profile_data["dominant_color"],
            })
            logger.info("Job %s completed", job_id)

        except Exception as e:
            logger.error("Job %s failed: %s", job_id, e, exc_info=True)
            job.status = "failed"
            job.error_code = type(e).__name__
            job.finished_at = datetime.now(timezone.utc)
            design.status = "failed"
            await db.commit()
            await cache_set(
                job_key(job_id_str),
                {"status": "failed", "error_code": type(e).__name__},
            )
