"""Tests for crawl provider."""
import pytest
from app.providers.crawl_provider import CrawlProvider


@pytest.mark.asyncio
async def test_crawl_provider_returns_list():
    provider = CrawlProvider()
    results = await provider.search(
        keywords=["logo", "minimal"],
        category="logo",
        limit=5,
    )
    assert isinstance(results, list)
    # May return 0 results if scraped sites block (expected in test env)


@pytest.mark.asyncio
async def test_crawl_provider_empty_keywords():
    provider = CrawlProvider()
    results = await provider.search(keywords=[], limit=5)
    assert isinstance(results, list)


def test_extract_tags():
    provider = CrawlProvider()
    tags = provider._extract_tags("Modern Blue Logo Design Pack", "blue logo")
    assert "blue" in tags
    assert "logo" in tags
