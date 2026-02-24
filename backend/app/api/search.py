from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.design import Design
from app.models.design_profile import DesignProfile
from app.models.search_result import SearchResult
from app.models.search_run import SearchRun
from app.providers.registry import get_provider
from app.schemas.search import SearchRequest, SearchResponse, SearchResultItem
from app.services.ranking import rank_results

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search(body: SearchRequest, db: AsyncSession = Depends(get_db)):
    design = await db.get(Design, body.design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    # Get design profile
    stmt = select(DesignProfile).where(DesignProfile.design_id == body.design_id)
    profile = (await db.execute(stmt)).scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=400,
            detail="Design has not been processed yet. Call /designs/{id}/process first.",
        )

    all_raw_results = []
    for provider_id in body.providers:
        provider = get_provider(provider_id)
        if not provider:
            continue
        raw = await provider.search(
            keywords=profile.keywords,
            dominant_color=profile.dominant_color,
            category=design.category_hint,
            limit=body.limit,
        )

        # Save search run
        run = SearchRun(profile_id=profile.id, provider_id=provider_id, status="done")
        db.add(run)
        await db.flush()

        for item in raw:
            item["search_run_id"] = run.id
        all_raw_results.extend(raw)

    # Rank
    ranked = rank_results(
        raw_results=all_raw_results,
        keywords=profile.keywords,
        negative_keywords=profile.negative_keywords,
        dominant_color=profile.dominant_color,
        embedding=profile.embedding,
    )

    # Save results
    result_items = []
    for i, r in enumerate(ranked[: body.limit]):
        sr = SearchResult(
            search_run_id=r["search_run_id"],
            title=r["title"],
            image_url=r.get("image_url"),
            product_url=r.get("product_url"),
            price=r.get("price"),
            score_overall=r["score_overall"],
            score_embedding=r.get("score_embedding", 0),
            score_color=r.get("score_color", 0),
            score_keyword=r.get("score_keyword", 0),
            explanation=r.get("explanation", []),
        )
        db.add(sr)
        result_items.append(
            SearchResultItem(
                title=r["title"],
                image_url=r.get("image_url"),
                product_url=r.get("product_url"),
                price=r.get("price"),
                score_overall=r["score_overall"],
                score_keyword=r.get("score_keyword", 0),
                score_color=r.get("score_color", 0),
                score_embedding=r.get("score_embedding", 0),
                explanation=r.get("explanation", []),
            )
        )

    await db.commit()
    return SearchResponse(results=result_items)
