# Architecture

## Stack

Frontend:
- Next.js (App Router)
- TypeScript
- TailwindCSS

Backend:
- FastAPI
- Python
- Background worker

Database:
- PostgreSQL

Cache / Queue:
- Redis

Storage:
- Object storage for images

---

## Modules

### API Layer
- sessions
- designs
- jobs
- search

### Worker
- process_design → generate DesignProfile
- collect_results → provider adapters
- ranking

### Ranking Engine
- kw_score
- color_score
- embedding_score (optional)
- penalty rules

---

## Separation of Concerns
- API handles orchestration
- Worker handles heavy processing
- Ranking is pure function
- Provider adapters isolated
