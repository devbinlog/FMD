"""Tests for image generator service."""
import pytest
from app.services.image_generator import generate_design_image, _enhance_prompt, _placeholder_result


def test_enhance_prompt_logo():
    result = _enhance_prompt("blue logo", "logo")
    assert "logo" in result.lower()
    assert "professional" in result.lower()


def test_enhance_prompt_ui():
    result = _enhance_prompt("dashboard", "ui")
    assert "UI design" in result


def test_placeholder_result():
    result = _placeholder_result("test prompt")
    assert result["method"] == "placeholder"
    assert "placehold" in result["image_url"]
    assert result["image_base64"] is None


def test_placeholder_deterministic():
    r1 = _placeholder_result("same prompt")
    r2 = _placeholder_result("same prompt")
    assert r1["image_url"] == r2["image_url"]


@pytest.mark.asyncio
async def test_generate_without_api_key():
    # No STABILITY_API_KEY set → fallback chain: Stable Horde → Pollinations.ai → SVG local → placeholder
    result = await generate_design_image("blue minimal logo")
    assert result["method"] in ("stable_horde", "pollinations_ai", "svg_local", "placeholder")
    assert result["image_url"]
