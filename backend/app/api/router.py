from fastapi import APIRouter

from app.api.sessions import router as sessions_router
from app.api.designs import router as designs_router
from app.api.jobs import router as jobs_router
from app.api.search import router as search_router

api_router = APIRouter(prefix="/api")
api_router.include_router(sessions_router, tags=["sessions"])
api_router.include_router(designs_router, tags=["designs"])
api_router.include_router(jobs_router, tags=["jobs"])
api_router.include_router(search_router, tags=["search"])
