"""DEPRECATED: Web crawling provider — replaced by api_provider.py.

This module scraped third-party websites (Freepik, DuckDuckGo) without
authorization, potentially violating their Terms of Service. It has been
replaced by ApiProvider which uses official, free-tier public APIs
(Unsplash, Pexels, Pixabay).

Do NOT use this provider in production. It is kept only as a reference.
"""
import logging
import random
import re
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup

from app.providers.base import BaseProvider

logger = logging.getLogger("fmd.crawl_provider")

_USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
]


class CrawlProvider(BaseProvider):
    """Crawls design marketplaces for real product results."""

    provider_id = "crawl"

    async def search(
        self,
        keywords: list[str],
        dominant_color: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[dict]:
        query = " ".join(keywords[:5])  # Limit query length
        if category:
            query = f"{category} {query}"

        results = []

        # Try Freepik
        try:
            freepik_results = await self._scrape_freepik(query, limit)
            results.extend(freepik_results)
        except Exception as e:
            logger.warning("Freepik scrape failed: %s", e)

        # Try DuckDuckGo image search as fallback
        if len(results) < limit:
            try:
                ddg_results = await self._scrape_ddg_images(query, limit - len(results))
                results.extend(ddg_results)
            except Exception as e:
                logger.warning("DDG image scrape failed: %s", e)

        return results[:limit]

    async def _scrape_freepik(self, query: str, limit: int) -> list[dict]:
        """Scrape Freepik search results."""
        url = f"https://www.freepik.com/search?format=search&query={quote_plus(query)}&type=vector"
        headers = {
            "User-Agent": random.choice(_USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
        }

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                logger.warning("Freepik returned %d", resp.status_code)
                return []

        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        # Freepik uses figure tags with data attributes for results
        figures = soup.select("figure[data-cy='resource-thumbnail']")
        if not figures:
            # Fallback: try common patterns
            figures = soup.select(".showcase__item, .list-resources figure, figure.showcase__content")

        for fig in figures[:limit]:
            try:
                # Try to extract image
                img = fig.select_one("img")
                img_url = None
                if img:
                    img_url = img.get("src") or img.get("data-src") or img.get("data-lazy")

                # Try to extract link
                link = fig.select_one("a")
                product_url = None
                title = "Freepik Design"
                if link:
                    href = link.get("href", "")
                    if href.startswith("/"):
                        product_url = f"https://www.freepik.com{href}"
                    elif href.startswith("http"):
                        product_url = href
                    title = link.get("title") or link.get_text(strip=True)[:100] or title

                if not title or title == "Freepik Design":
                    alt = img.get("alt", "") if img else ""
                    if alt:
                        title = alt[:100]

                if img_url or product_url:
                    results.append({
                        "title": title,
                        "image_url": img_url,
                        "product_url": product_url,
                        "price": 0,  # Freepik has free assets
                        "color_hex": None,
                        "tags": self._extract_tags(title, query),
                    })
            except Exception:
                continue

        logger.info("Freepik: found %d results for '%s'", len(results), query)
        return results

    async def _scrape_ddg_images(self, query: str, limit: int) -> list[dict]:
        """Scrape DuckDuckGo image search as fallback for design images."""
        design_query = f"{query} design asset"
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(design_query)}"
        headers = {
            "User-Agent": random.choice(_USER_AGENTS),
            "Accept": "text/html",
        }

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return []

        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        for result in soup.select(".result")[:limit]:
            try:
                link_el = result.select_one("a.result__a")
                snippet_el = result.select_one(".result__snippet")

                if not link_el:
                    continue

                title = link_el.get_text(strip=True)[:100]
                href = link_el.get("href", "")
                snippet = snippet_el.get_text(strip=True)[:200] if snippet_el else ""

                # Extract actual URL from DDG redirect
                product_url = href
                if "uddg=" in href:
                    from urllib.parse import parse_qs, urlparse
                    parsed = urlparse(href)
                    params = parse_qs(parsed.query)
                    if "uddg" in params:
                        product_url = params["uddg"][0]

                results.append({
                    "title": title,
                    "image_url": None,  # DDG HTML doesn't include images easily
                    "product_url": product_url,
                    "price": None,
                    "color_hex": None,
                    "tags": self._extract_tags(title + " " + snippet, query),
                })
            except Exception:
                continue

        logger.info("DDG: found %d results for '%s'", len(results), query)
        return results

    def _extract_tags(self, text: str, query: str) -> list[str]:
        """Extract tags from result text + query."""
        words = set(re.findall(r"[a-zA-Z]{3,}", text.lower()))
        query_words = set(re.findall(r"[a-zA-Z]{3,}", query.lower()))
        # Combine and limit
        tags = list((words & query_words) | query_words)
        return tags[:8]
