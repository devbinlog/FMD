# CLAUDE.md

## Project

FMD (Find My Design) — AI-powered design search engine. Users describe a design via text or sketch, system generates a DesignProfile, creates an AI reference image (Stable Diffusion), searches providers (mock + web crawling), ranks results, and returns product recommendations.

## Repository

- Remote: https://github.com/Kimtaebin/truer.git
- Main branch: `main`

## Architecture

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4 + Lucide React (port 3000)
- **Backend**: FastAPI + SQLAlchemy async + Pydantic v2 (port 8000)
- **Database**: SQLite (dev, zero-config) / PostgreSQL (prod)
- **Queue**: In-memory asyncio.Queue (dev) / Redis (prod)
- **AI**: Stability AI API (Stable Diffusion) for reference image generation
- **Crawling**: httpx + BeautifulSoup for web scraping design marketplaces

## Commands

```bash
# Install
cd backend && pip install -r requirements.txt
cd frontend && pnpm install

# Development
pnpm dev:fe          # Next.js frontend (:3000)
pnpm dev:be          # FastAPI backend (:8000)
pnpm dev             # Both concurrent

# Testing (21 tests)
pnpm test:be         # All backend tests
pnpm test:be:one     # Single test: pnpm test:be:one "test_name"

# Build
pnpm build:fe
```

## Key Files

### Backend
- `app/main.py` — FastAPI entry + DB init + provider seeding
- `app/api/` — 5 endpoints (sessions, designs, designs/process, jobs, search)
- `app/models/` — 7 SQLAlchemy models (portable types for SQLite+Postgres)
- `app/services/ranking.py` — Ranking v1 (kw + color + meta scores + penalties)
- `app/services/profile_generator.py` — Keyword extraction + canvas color analysis (Pillow)
- `app/services/image_generator.py` — Stability AI (Stable Diffusion) integration
- `app/providers/mock_provider.py` — 22 sample design products
- `app/providers/crawl_provider.py` — Web scraper (Freepik + DuckDuckGo)
- `app/worker/processor.py` — Inline async job processor
- `app/core/types.py` — Portable SQLAlchemy types (GUID, JSONType, StringArray)
- `app/core/redis.py` — In-memory queue/cache/lock (no Redis required)

### Frontend
- `src/app/page.tsx` — SPA with 4 states + AI analysis panel
- `src/components/` — 8 components (Header, Footer, InputModeTabs, TextPromptPanel, DrawingCanvas, CategorySelector, ProductCard, EmptyState)
- `src/lib/api.ts` — API client + job polling
- `src/types/api.ts` — TypeScript types

## Environment Variables (optional)

```bash
STABILITY_API_KEY=sk-...  # Stability AI key for real SD image generation
DATABASE_URL=postgresql+asyncpg://...  # Override SQLite default
REDIS_URL=redis://...  # Override in-memory queue
```
