"""Tests for profile generator."""
from app.services.profile_generator import generate_profile


def test_basic_text_prompt():
    result = generate_profile("minimal blue geometric logo", "logo")
    assert "minimal" in result["keywords"]
    assert "blue" in result["keywords"]
    assert "geometric" in result["keywords"]
    assert "logo" in result["keywords"]
    assert result["dominant_color"] == "#2563eb"  # blue
    assert result["profile_hash"]


def test_empty_prompt():
    result = generate_profile(None, None)
    assert result["keywords"] == []
    assert result["dominant_color"] is None
    assert result["profile_hash"]


def test_category_added_to_keywords():
    result = generate_profile("modern design", "UI")
    assert "ui" in result["keywords"]


def test_korean_color():
    result = generate_profile("파란색 로고", None)
    assert result["dominant_color"] == "#2563eb"


def test_stopwords_removed():
    result = generate_profile("a logo for the company", None)
    assert "a" not in result["keywords"]
    assert "the" not in result["keywords"]
    assert "for" not in result["keywords"]
