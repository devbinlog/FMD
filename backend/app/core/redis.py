"""Redis client with in-memory fallback.

When REDIS_URL is empty, uses a simple asyncio.Queue + dict for development
so the app runs without a Redis server.
"""
import asyncio
import json
import time

from app.core.config import settings

# ---------------------------------------------------------------------------
# In-memory fallback (no Redis required)
# ---------------------------------------------------------------------------

_mem_queue: asyncio.Queue[str] = asyncio.Queue()
_mem_cache: dict[str, tuple[str, float]] = {}  # key -> (value_json, expire_ts)
_mem_locks: dict[str, float] = {}  # key -> expire_ts


def _key(pattern: str) -> str:
    return pattern.replace("{env}", settings.ENV)


# Queue
QUEUE_KEY = _key("fmd:{env}:queue:process")


def job_key(job_id: str) -> str:
    return _key(f"fmd:{{env}}:job:{job_id}")


def profile_key(profile_hash: str) -> str:
    return _key(f"fmd:{{env}}:profile:{profile_hash}")


def search_key(profile_hash: str, provider: str) -> str:
    return _key(f"fmd:{{env}}:search:{profile_hash}:{provider}")


def lock_key(design_id: str) -> str:
    return _key(f"fmd:{{env}}:lock:process:{design_id}")


async def enqueue_job(job_id: str) -> None:
    await _mem_queue.put(job_id)


async def dequeue_job(timeout: int = 0) -> str | None:
    try:
        if timeout <= 0:
            return await asyncio.wait_for(_mem_queue.get(), timeout=5)
        return await asyncio.wait_for(_mem_queue.get(), timeout=timeout)
    except asyncio.TimeoutError:
        return None


async def cache_set(key: str, value: dict, ttl: int = 3600) -> None:
    _mem_cache[key] = (json.dumps(value), time.time() + ttl)


async def cache_get(key: str) -> dict | None:
    entry = _mem_cache.get(key)
    if entry is None:
        return None
    value_json, expire_ts = entry
    if time.time() > expire_ts:
        del _mem_cache[key]
        return None
    return json.loads(value_json)


async def acquire_lock(key: str, ttl: int = 300) -> bool:
    now = time.time()
    existing = _mem_locks.get(key)
    if existing and existing > now:
        return False
    _mem_locks[key] = now + ttl
    return True


async def release_lock(key: str) -> None:
    _mem_locks.pop(key, None)
