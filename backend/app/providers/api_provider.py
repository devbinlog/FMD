"""Public API provider — searches free stock image APIs for design assets.

Uses official, free-tier APIs only:
  1. Unsplash (50 req/hr)  — photos & design assets
  2. Pexels   (200 req/hr) — photos
  3. Pixabay  (100 req/hr) — vectors, illustrations, photos

Each API key is optional; missing keys cause that source to be skipped.
When ALL keys are missing, generates fallback results linking to real
marketplace search pages so the demo remains functional.
"""
import logging
import os
import re
from urllib.parse import quote_plus

import httpx

from app.providers.base import BaseProvider

logger = logging.getLogger("fmd.api_provider")

_TIMEOUT = 10.0


class ApiProvider(BaseProvider):
    """Searches public image APIs for design-related results."""

    provider_id = "api"

    def __init__(self) -> None:
        self._unsplash_key = os.getenv("UNSPLASH_ACCESS_KEY", "")
        self._pexels_key = os.getenv("PEXELS_API_KEY", "")
        self._pixabay_key = os.getenv("PIXABAY_API_KEY", "")

    async def search(
        self,
        keywords: list[str],
        dominant_color: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[dict]:
        # Use only English keywords for API/marketplace searches
        en_keywords = [k for k in keywords if re.match(r"[a-zA-Z]", k)]
        query = " ".join(en_keywords[:5]) if en_keywords else "design"
        if category:
            query = f"{category} {query}"

        has_any_key = any([self._unsplash_key, self._pexels_key, self._pixabay_key])

        if not has_any_key:
            return self._fallback_results(en_keywords, category, query, limit)

        per_source = max(limit // 3, 5)
        results: list[dict] = []

        for fetcher in (self._search_unsplash, self._search_pexels, self._search_pixabay):
            try:
                items = await fetcher(query, dominant_color, per_source)
                results.extend(items)
            except Exception as e:
                logger.warning("%s failed: %s", fetcher.__name__, e)

        return results[:limit]

    # ------------------------------------------------------------------
    # Fallback: real marketplace links when no API keys configured
    # ------------------------------------------------------------------
    def _fallback_results(
        self, keywords: list[str], category: str | None, query: str, limit: int
    ) -> list[dict]:
        q = quote_plus(query)
        sources = [
            ("Unsplash", f"https://unsplash.com/s/photos/{q}"),
            ("Pexels", f"https://www.pexels.com/search/{q}/"),
            ("Pixabay", f"https://pixabay.com/images/search/{q}/"),
            ("Dribbble", f"https://dribbble.com/search/{q}"),
            ("Behance", f"https://www.behance.net/search/projects?search={q}"),
            ("Figma Community", f"https://www.figma.com/community/search?searchTerm={q}&resource_type=mixed"),
            ("Creative Market", f"https://creativemarket.com/search?q={q}"),
            ("Freepik", f"https://www.freepik.com/search?format=search&query={q}"),
        ]

        cat_label = (category or "Design").capitalize()
        kw_words = [w for w in keywords if w.lower() != cat_label.lower()]
        title_kw = " ".join(w.capitalize() for w in kw_words[:3]) if kw_words else "Design"
        tags = [k.lower() for k in keywords[:6]]
        base_seed = "-".join(keywords[:3]) if keywords else "design"

        results = []
        for i, (name, url) in enumerate(sources[:limit]):
            seed = f"{base_seed}-{name.lower().replace(' ', '-')}"
            results.append({
                "title": f"{title_kw} {cat_label} — {name}",
                "image_url": f"https://picsum.photos/seed/{seed}/400/300",
                "product_url": url,
                "price": 0,
                "color_hex": None,
                "tags": tags + [name.lower()],
            })

        logger.info("Fallback: generated %d marketplace links for '%s'", len(results), query)
        return results

    # ------------------------------------------------------------------
    # Unsplash  https://unsplash.com/documentation#search-photos
    # ------------------------------------------------------------------
    async def _search_unsplash(
        self, query: str, color: str | None, limit: int
    ) -> list[dict]:
        if not self._unsplash_key:
            return []

        params: dict = {
            "query": query,
            "per_page": limit,
            "orientation": "squarish",
        }
        if color:
            params["color"] = self._hex_to_unsplash_color(color)

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                "https://api.unsplash.com/search/photos",
                params=params,
                headers={"Authorization": f"Client-ID {self._unsplash_key}"},
            )
            resp.raise_for_status()

        data = resp.json()
        results = []
        for photo in data.get("results", []):
            results.append({
                "title": (photo.get("description") or photo.get("alt_description") or "Unsplash Photo")[:120],
                "image_url": photo.get("urls", {}).get("small"),
                "product_url": photo.get("links", {}).get("html"),
                "price": 0,
                "color_hex": photo.get("color"),
                "tags": [t["title"] for t in photo.get("tags", [])[:8] if "title" in t],
            })
        logger.info("Unsplash: %d results for '%s'", len(results), query)
        return results

    # ------------------------------------------------------------------
    # Pexels  https://www.pexels.com/api/documentation/#photos-search
    # ------------------------------------------------------------------
    async def _search_pexels(
        self, query: str, color: str | None, limit: int
    ) -> list[dict]:
        if not self._pexels_key:
            return []

        params: dict = {"query": query, "per_page": limit}
        if color:
            params["color"] = color.lstrip("#")

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                "https://api.pexels.com/v1/search",
                params=params,
                headers={"Authorization": self._pexels_key},
            )
            resp.raise_for_status()

        data = resp.json()
        results = []
        for photo in data.get("photos", []):
            results.append({
                "title": (photo.get("alt") or "Pexels Photo")[:120],
                "image_url": photo.get("src", {}).get("medium"),
                "product_url": photo.get("url"),
                "price": 0,
                "color_hex": photo.get("avg_color"),
                "tags": [w for w in query.lower().split()[:8]],
            })
        logger.info("Pexels: %d results for '%s'", len(results), query)
        return results

    # ------------------------------------------------------------------
    # Pixabay  https://pixabay.com/api/docs/
    # ------------------------------------------------------------------
    async def _search_pixabay(
        self, query: str, color: str | None, limit: int
    ) -> list[dict]:
        if not self._pixabay_key:
            return []

        params: dict = {
            "key": self._pixabay_key,
            "q": query,
            "per_page": limit,
            "image_type": "vector",
            "safesearch": "true",
        }
        if color:
            params["colors"] = self._hex_to_pixabay_color(color)

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(
                "https://pixabay.com/api/",
                params=params,
            )
            resp.raise_for_status()

        data = resp.json()
        results = []
        for hit in data.get("hits", []):
            results.append({
                "title": (hit.get("tags") or "Pixabay Image")[:120],
                "image_url": hit.get("webformatURL"),
                "product_url": hit.get("pageURL"),
                "price": 0,
                "color_hex": None,
                "tags": [t.strip() for t in (hit.get("tags") or "").split(",")[:8]],
            })
        logger.info("Pixabay: %d results for '%s'", len(results), query)
        return results

    # ------------------------------------------------------------------
    # Color helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _hex_to_unsplash_color(hex_color: str) -> str:
        mapping = {
            "black": [(0, 0, 0)],
            "white": [(255, 255, 255)],
            "red": [(255, 0, 0), (200, 0, 0)],
            "orange": [(255, 165, 0), (255, 140, 0)],
            "yellow": [(255, 255, 0), (255, 215, 0)],
            "green": [(0, 128, 0), (0, 255, 0)],
            "teal": [(0, 128, 128)],
            "blue": [(0, 0, 255), (0, 100, 200)],
            "purple": [(128, 0, 128), (148, 0, 211)],
        }
        try:
            h = hex_color.lstrip("#")
            r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        except (ValueError, IndexError):
            return "black_and_white"

        best_name = "black_and_white"
        best_dist = float("inf")
        for name, refs in mapping.items():
            for rr, rg, rb in refs:
                d = (r - rr) ** 2 + (g - rg) ** 2 + (b - rb) ** 2
                if d < best_dist:
                    best_dist = d
                    best_name = name
        return best_name

    @staticmethod
    def _hex_to_pixabay_color(hex_color: str) -> str:
        mapping = {
            "red": [(255, 0, 0)],
            "orange": [(255, 165, 0)],
            "yellow": [(255, 255, 0)],
            "green": [(0, 128, 0)],
            "turquoise": [(0, 128, 128)],
            "blue": [(0, 0, 255)],
            "lilac": [(200, 162, 200)],
            "pink": [(255, 192, 203)],
            "white": [(255, 255, 255)],
            "gray": [(128, 128, 128)],
            "black": [(0, 0, 0)],
            "brown": [(139, 69, 19)],
        }
        try:
            h = hex_color.lstrip("#")
            r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        except (ValueError, IndexError):
            return "grayscale"

        best_name = "grayscale"
        best_dist = float("inf")
        for name, refs in mapping.items():
            for rr, rg, rb in refs:
                d = (r - rr) ** 2 + (g - rg) ** 2 + (b - rb) ** 2
                if d < best_dist:
                    best_dist = d
                    best_name = name
        return best_name
