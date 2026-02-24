from pathlib import Path

from pydantic_settings import BaseSettings

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
_DB_PATH = _BASE_DIR / "fmd.db"


class Settings(BaseSettings):
    DATABASE_URL: str = f"sqlite+aiosqlite:///{_DB_PATH}"
    REDIS_URL: str = ""  # empty = use in-memory queue
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    ENV: str = "dev"
    WORKER_CONCURRENCY: int = 2
    JOB_TIMEOUT_SECONDS: int = 300

    STABILITY_API_KEY: str = ""
    UNSPLASH_ACCESS_KEY: str = ""
    PEXELS_API_KEY: str = ""
    PIXABAY_API_KEY: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
