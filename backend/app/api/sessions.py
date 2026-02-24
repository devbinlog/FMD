import hashlib
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.design import Design
from app.models.design_profile import DesignProfile
from app.models.search_result import SearchResult
from app.models.search_run import SearchRun
from app.models.session import Session
from app.schemas.session import (
    HistoryItem,
    HistoryResponse,
    HistoryResultItem,
    SessionResponse,
)

router = APIRouter()


@router.post("/sessions", response_model=SessionResponse)
async def create_session(request: Request, db: AsyncSession = Depends(get_db)):
    ip_raw = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(ip_raw.encode()).hexdigest()[:16]
    user_agent = request.headers.get("user-agent", "")[:512]

    session = Session(user_agent=user_agent, ip_hash=ip_hash)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionResponse(session_id=session.id)


@router.get("/sessions/{session_id}/history", response_model=HistoryResponse)
async def get_session_history(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, str(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Load all processed designs for this session, newest first
    stmt = (
        select(Design)
        .where(
            Design.session_id == str(session_id),
            Design.status.in_(["processed", "processing"]),
        )
        .order_by(Design.created_at.desc())
        .limit(20)
    )
    designs = (await db.execute(stmt)).scalars().all()

    items: list[HistoryItem] = []
    for design in designs:
        # Load profile
        prof_stmt = select(DesignProfile).where(
            DesignProfile.design_id == str(design.id)
        )
        profile = (await db.execute(prof_stmt)).scalar_one_or_none()

        ai_image_url = None
        keywords: list[str] = []
        dominant_color = None
        top_results: list[HistoryResultItem] = []

        if profile:
            ai_image_url = profile.profile.get("ai_image_url") if profile.profile else None
            keywords = profile.keywords or []
            dominant_color = profile.dominant_color

            # Most recent search run for this profile
            run_stmt = (
                select(SearchRun)
                .where(SearchRun.profile_id == str(profile.id))
                .order_by(SearchRun.created_at.desc())
                .limit(1)
            )
            run = (await db.execute(run_stmt)).scalar_one_or_none()

            if run:
                res_stmt = (
                    select(SearchResult)
                    .where(SearchResult.search_run_id == str(run.id))
                    .order_by(SearchResult.score_overall.desc())
                    .limit(3)
                )
                results = (await db.execute(res_stmt)).scalars().all()
                top_results = [
                    HistoryResultItem(
                        title=r.title,
                        image_url=r.image_url,
                        product_url=r.product_url,
                        score_overall=r.score_overall,
                    )
                    for r in results
                ]

        items.append(
            HistoryItem(
                design_id=design.id,
                text_prompt=design.text_prompt,
                category_hint=design.category_hint,
                input_mode=design.input_mode,
                created_at=design.created_at,
                ai_image_url=ai_image_url,
                keywords=keywords,
                dominant_color=dominant_color,
                top_results=top_results,
            )
        )

    return HistoryResponse(session_id=session_id, items=items, total=len(items))
