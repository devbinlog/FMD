import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import engine, Base, async_session
from app.models import *  # noqa: F401,F403 — ensure all models registered

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed mock provider
    async with async_session() as db:
        from app.models.provider import Provider

        for pid, pname in [("mock", "Mock Provider"), ("api", "API Provider")]:
            existing = await db.get(Provider, pid)
            if not existing:
                db.add(Provider(id=pid, name=pname, base_url="", enabled=True))
        await db.commit()

    yield


app = FastAPI(title="FMD API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}
