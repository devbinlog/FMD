"""Search-based provider — queries Google and Naver for real design results.

Priority chain:
  1. Naver Image Search   (NAVER_CLIENT_ID + NAVER_CLIENT_SECRET)  — Korean thumbnails
  2. Google Custom Search (GOOGLE_API_KEY + GOOGLE_CX)             — International results
  3. Openverse API        (no key, free)                           — CC-licensed image fallback

API keys are optional for demo; Openverse fallback always works.
- Naver: https://developers.naver.com/apps/#/register (free, instant)
- Google: https://programmablesearch.google.com/create (100 req/day free)
"""
import logging
import os
import re

import httpx

from app.providers.base import BaseProvider

logger = logging.getLogger("fmd.search_provider")

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_CX = os.getenv("GOOGLE_CX", "")  # Programmable Search Engine ID


class SearchProvider(BaseProvider):
    """Fetches real design results from Google / Naver / Openverse."""

    provider_id = "search"

    async def search(
        self,
        keywords: list[str],
        dominant_color: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[dict]:
        en_kws = [k for k in keywords if re.match(r"[a-zA-Z]", k)]
        ko_kws = [k for k in keywords if re.match(r"[가-힣]", k)]

        results: list[dict] = []
        half = max(limit // 2, 5)

        # ── 1. Naver Image Search  (Korean thumbnails) ───────────────────────
        if NAVER_CLIENT_ID and NAVER_CLIENT_SECRET:
            naver_q = self._build_query(ko_kws or en_kws, category, lang="ko")
            naver = await self._naver_image_search(naver_q, half)
            results.extend(naver)
            logger.info("Naver: +%d (total %d)", len(naver), len(results))

        # ── 2. Google Custom Search ──────────────────────────────────────────
        if GOOGLE_API_KEY and GOOGLE_CX:
            google_q = self._build_query(en_kws, category, lang="en")
            google = await self._google_search(google_q, half)
            results.extend(google)
            logger.info("Google: +%d (total %d)", len(google), len(results))

        # ── 3. Openverse fallback  (no API key required) ─────────────────────
        if not results:
            # English search query
            ov_en_q = self._build_query(en_kws, category, lang="en")
            ov_en = await self._openverse_search(ov_en_q, half)
            results.extend(ov_en)

            # Korean → additional English query for better Openverse coverage
            if ko_kws and len(results) < limit:
                ov_ko_q = self._build_query(ko_kws, category, lang="en")  # Openverse is English
                ov_ko = await self._openverse_search(ov_ko_q, half)
                results.extend(ov_ko)

            if not results:
                # Absolute fallback: query by category alone
                fallback_q = (category or "design") + " illustration"
                results.extend(await self._openverse_search(fallback_q, limit))

            logger.info("Openverse fallback: %d results", len(results))

        # Deduplicate by URL
        seen: set[str] = set()
        unique: list[dict] = []
        for r in results:
            url = r.get("product_url", "")
            if url and url not in seen:
                seen.add(url)
                unique.append(r)

        return unique[:limit]

    # ── Query builder ────────────────────────────────────────────────────────

    def _build_query(
        self, keywords: list[str], category: str | None, lang: str
    ) -> str:
        kws = keywords[:4] if keywords else ["design"]
        q = " ".join(kws)
        if category and category.lower() not in q.lower():
            q = f"{q} {category}"
        if lang == "ko":
            return (f"{q} 디자인" if "디자인" not in q else q).strip()
        else:
            return (f"{q} design" if "design" not in q.lower() else q).strip()

    # ── Naver Image Search API ───────────────────────────────────────────────

    async def _naver_image_search(self, query: str, limit: int) -> list[dict]:
        """Naver Image Search — Korean design content with thumbnails."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://openapi.naver.com/v1/search/image",
                    params={"query": query, "display": min(limit, 10), "sort": "sim"},
                    headers={
                        "X-Naver-Client-Id": NAVER_CLIENT_ID,
                        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
                    },
                )
                if resp.status_code == 200:
                    items = resp.json().get("items", [])
                    results = []
                    for item in items:
                        title = re.sub(r"<[^>]+>", "", item.get("title", "Design"))
                        link = item.get("link") or item.get("originallink", "")
                        if not link.startswith("http"):
                            continue
                        results.append({
                            "title": title,
                            "image_url": item.get("thumbnail"),
                            "product_url": link,
                            "price": None,
                            "color_hex": None,
                            "tags": self._tags(title, query),
                        })
                    return results
                logger.warning("Naver API returned %d", resp.status_code)
        except Exception as exc:
            logger.warning("Naver error: %s", exc)
        return []

    # ── Google Custom Search JSON API ────────────────────────────────────────

    async def _google_search(self, query: str, limit: int) -> list[dict]:
        """Google Custom Search — web results with optional thumbnails."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={
                        "key": GOOGLE_API_KEY,
                        "cx": GOOGLE_CX,
                        "q": query,
                        "num": min(limit, 10),
                    },
                )
                if resp.status_code == 200:
                    items = resp.json().get("items", [])
                    results = []
                    for item in items:
                        title = item.get("title", "")
                        snippet = item.get("snippet", "")
                        pagemap = item.get("pagemap", {})
                        thumbnails = pagemap.get("cse_thumbnail", [])
                        img_url = thumbnails[0].get("src") if thumbnails else None
                        results.append({
                            "title": title,
                            "image_url": img_url,
                            "product_url": item.get("link"),
                            "price": None,
                            "color_hex": None,
                            "tags": self._tags(title + " " + snippet, query),
                        })
                    return results
                logger.warning("Google API returned %d: %s", resp.status_code, resp.text[:120])
        except Exception as exc:
            logger.warning("Google error: %s", exc)
        return []

    # ── Openverse fallback (no key needed) ───────────────────────────────────

    async def _openverse_search(self, query: str, limit: int) -> list[dict]:
        """Openverse CC-licensed image search — free, no API key required.

        Returns real images from Flickr, RawPixel, Wikipedia, etc. with
        direct thumbnail URLs and links to the original source pages.
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.openverse.org/v1/images/",
                    params={
                        "q": query,
                        "page_size": min(limit, 10),
                        "license_type": "commercial,modification",
                    },
                    headers={"User-Agent": "FMD-Portfolio/1.0 (design-search-demo)"},
                )
                if resp.status_code == 200:
                    items = resp.json().get("results", [])
                    results = []
                    for item in items:
                        title = item.get("title") or item.get("creator", "Design")
                        product_url = (
                            item.get("foreign_landing_url")
                            or item.get("url", "")
                        )
                        if not product_url.startswith("http"):
                            continue
                        # Prefer thumbnail; fall back to full image URL
                        img_url = item.get("thumbnail") or item.get("url")
                        results.append({
                            "title": title,
                            "image_url": img_url,
                            "product_url": product_url,
                            "price": None,
                            "color_hex": None,
                            "tags": self._tags(title, query),
                        })
                    return results
                logger.warning("Openverse returned %d", resp.status_code)
        except Exception as exc:
            logger.warning("Openverse search error: %s", exc)
        return []

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _tags(self, text: str, query: str) -> list[str]:
        words = set(re.findall(r"[a-zA-Z가-힣]{2,}", text.lower()))
        q_words = set(re.findall(r"[a-zA-Z가-힣]{2,}", query.lower()))
        return list((words & q_words) | q_words)[:10]
