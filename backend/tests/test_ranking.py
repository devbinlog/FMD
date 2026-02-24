"""Tests for ranking v1 — edge cases per docs/05_ranking.md"""
from app.services.ranking import rank_results


def _make_item(**kwargs):
    base = {
        "title": "Test Product",
        "image_url": "https://example.com/img.png",
        "product_url": "https://example.com/product",
        "price": 10000,
        "color_hex": "#2563eb",
        "tags": ["ui", "minimal"],
        "search_run_id": "run-1",
    }
    base.update(kwargs)
    return base


def test_basic_ranking():
    items = [
        _make_item(title="Blue Minimal UI Kit", tags=["ui", "minimal", "blue"]),
        _make_item(title="Red Icon Pack", tags=["icon", "red"], color_hex="#ef4444"),
    ]
    results = rank_results(
        raw_results=items,
        keywords=["blue", "minimal", "ui"],
        negative_keywords=[],
        dominant_color="#2563eb",
    )
    assert len(results) == 2
    # Blue minimal should rank higher
    assert results[0]["title"] == "Blue Minimal UI Kit"
    assert results[0]["score_overall"] > results[1]["score_overall"]


def test_negative_keyword_penalty():
    items = [
        _make_item(title="Good Design", tags=["logo"]),
        _make_item(title="Bad Ugly Design", tags=["ugly"]),
    ]
    results = rank_results(
        raw_results=items,
        keywords=["design"],
        negative_keywords=["ugly"],
        dominant_color=None,
    )
    bad_item = [r for r in results if "Ugly" in r["title"]][0]
    good_item = [r for r in results if "Good" in r["title"]][0]
    assert good_item["score_overall"] > bad_item["score_overall"]


def test_no_image_penalty():
    items = [
        _make_item(title="With Image"),
        _make_item(title="No Image", image_url=None),
    ]
    results = rank_results(
        raw_results=items,
        keywords=["image"],
        negative_keywords=[],
        dominant_color=None,
    )
    with_img = [r for r in results if r["title"] == "With Image"][0]
    no_img = [r for r in results if r["title"] == "No Image"][0]
    assert with_img["score_overall"] >= no_img["score_overall"]


def test_empty_input():
    results = rank_results(
        raw_results=[],
        keywords=[],
        negative_keywords=[],
        dominant_color=None,
    )
    assert results == []


def test_explanation_has_at_least_2_reasons():
    items = [_make_item()]
    results = rank_results(
        raw_results=items,
        keywords=["test"],
        negative_keywords=[],
        dominant_color=None,
    )
    assert len(results[0]["explanation"]) >= 2


def test_color_similarity():
    items = [
        _make_item(title="Same Color", color_hex="#2563eb"),
        _make_item(title="Opposite Color", color_hex="#ef4444"),
    ]
    results = rank_results(
        raw_results=items,
        keywords=[],
        negative_keywords=[],
        dominant_color="#2563eb",
    )
    same = [r for r in results if r["title"] == "Same Color"][0]
    diff = [r for r in results if r["title"] == "Opposite Color"][0]
    assert same["score_color"] > diff["score_color"]


def test_duplicate_url_penalty():
    items = [
        _make_item(title="First", product_url="https://example.com/same"),
        _make_item(title="Duplicate", product_url="https://example.com/same"),
    ]
    results = rank_results(
        raw_results=items,
        keywords=["first"],
        negative_keywords=[],
        dominant_color=None,
    )
    # Both should still be returned
    assert len(results) == 2
