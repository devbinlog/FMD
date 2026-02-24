"""AI Image Generation service — priority chain:

  1. ComfyUI (local SDXL)  — when COMFYUI_URL is reachable
  2. Stability AI API       — when STABILITY_API_KEY is set
  3. HuggingFace Inference  — when HF_TOKEN is set (free tier available)
  4. Stable Horde           — free crowdsourced SD (STABLE_HORDE_API_KEY, registered account)
  5. placehold.co           — static placeholder (last resort)

Free setup options (pick one):
  - HuggingFace free token: https://huggingface.co/settings/tokens → HF_TOKEN=hf_xxx
  - Stability AI free credits: https://platform.stability.ai/ → STABILITY_API_KEY=sk-xxx
  - Stable Horde free account: https://stablehorde.net/ → STABLE_HORDE_API_KEY=xxx
"""
import asyncio
import logging
import os
from typing import Optional
from urllib.parse import quote, quote_plus

import httpx

logger = logging.getLogger("fmd.image_generator")

STABILITY_API_KEY = os.getenv("STABILITY_API_KEY", "")
STABILITY_API_URL = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
COMFYUI_URL = os.getenv("COMFYUI_URL", "")
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "black-forest-labs/FLUX.1-schnell")
STABLE_HORDE_KEY = os.getenv("STABLE_HORDE_API_KEY", "")  # empty = skip (anonymous has 2h queue)
STABLE_HORDE_URL = "https://stablehorde.net/api/v2"


async def generate_design_image(
    prompt: str,
    style: str = "design-asset",
    *,
    cfg: float = 7.0,
    steps: int = 20,
    seed: int = 42,
    control_image_b64: Optional[str] = None,
) -> dict:
    """Generate an AI reference image from a text prompt.

    Priority order:
      ComfyUI (local) → Stability AI → Pollinations.ai → placeholder
    """
    enhanced_prompt = _enhance_prompt(prompt, style)

    # 1. ComfyUI (local SDXL) — preferred when available
    if COMFYUI_URL:
        from app.services.comfyui_generator import generate_via_comfyui, is_comfyui_available
        if await is_comfyui_available():
            logger.info("Using ComfyUI at %s", COMFYUI_URL)
            result = await generate_via_comfyui(
                enhanced_prompt,
                cfg=cfg,
                steps=steps,
                seed=seed,
                control_image_b64=control_image_b64,
            )
            if result.get("image_url"):
                return result
            logger.warning("ComfyUI returned no image, falling through")

    # 2. Stability AI (cloud)
    if STABILITY_API_KEY:
        return await _generate_via_stability(enhanced_prompt)

    # 3. HuggingFace Inference API (free with free token)
    if HF_TOKEN:
        logger.info("Using HuggingFace Inference API (%s)", HF_MODEL)
        result = await _hf_inference_result(enhanced_prompt)
        if result.get("image_url"):
            return result

    # 4. Stable Horde (registered account only — anonymous queue is ~2h)
    if STABLE_HORDE_KEY:
        logger.info("Using Stable Horde")
        result = await _stable_horde_result(enhanced_prompt)
        if result.get("image_url"):
            return result

    # 5. Pollinations.ai — backend fetches image as base64 (no browser dependency)
    logger.info("Using Pollinations.ai (free, no API key needed)")
    return await _pollinations_fetch(prompt, style)


def _enhance_prompt(prompt: str, style: str) -> str:
    """Enhance user prompt for better design-focused generation."""
    style_suffixes = {
        "design-asset": ", professional design asset, clean background, high quality, vector style",
        "logo": ", professional logo design, minimal, clean, vector, white background",
        "ui": ", modern UI design, clean interface, professional, Figma style",
        "icon": ", flat design icon, minimal, clean lines, solid colors",
        "illustration": ", digital illustration, professional art, vibrant colors",
    }
    suffix = style_suffixes.get(style, style_suffixes["design-asset"])
    return f"{prompt}{suffix}"


async def _generate_via_stability(prompt: str) -> dict:
    """Call Stability AI API to generate image."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                STABILITY_API_URL,
                headers={
                    "Authorization": f"Bearer {STABILITY_API_KEY}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "text_prompts": [
                        {"text": prompt, "weight": 1.0},
                        {"text": "blurry, low quality, text, watermark", "weight": -1.0},
                    ],
                    "cfg_scale": 7,
                    "width": 512,
                    "height": 512,
                    "steps": 30,
                    "samples": 1,
                },
            )

            if response.status_code == 200:
                data = response.json()
                artifacts = data.get("artifacts", [])
                if artifacts:
                    img_b64 = artifacts[0]["base64"]
                    return {
                        "image_base64": img_b64,
                        "image_url": f"data:image/png;base64,{img_b64}",
                        "method": "stability_api",
                    }

            logger.warning(
                "Stability API returned %d: %s",
                response.status_code,
                response.text[:200],
            )
            return await _pollinations_fetch(prompt)

    except Exception as e:
        logger.error("Stability API error: %s", e)
        return await _pollinations_fetch(prompt)


async def _pollinations_fetch(prompt: str, style: str = "design-asset") -> dict:
    """Try Pollinations.ai with single English keywords one at a time.

    Key constraints (discovered by testing):
      - Only SINGLE words work — multi-word prompts cause 530
      - No query parameters (even nologo=true causes 530 for some words)
      - Some common words (logo, minimal, icon) return 530 → try synonyms
      - Falls back to local SVG generation if all attempts fail
    """
    import re
    import base64
    from app.services.profile_generator import _KO_EN_MAP

    # Only filter truly generic suffix words (NOT user design keywords like flat/icon/logo)
    _SUFFIX_NOISE = {
        "professional", "asset", "background", "high", "quality",
        "vector", "style", "digital", "vibrant", "colors",
        "interface", "figma", "solid", "lines", "white", "clean",
    }

    # Synonyms for words that consistently get 530 from Pollinations.ai
    _SYNONYMS: dict[str, str] = {
        "logo": "brand",
        "icon": "symbol",
        "minimal": "simple",
        "modern": "sleek",
        "flat": "geometric",
        "design": "artwork",
        "illustration": "drawing",
        "graphic": "visual",
        "pattern": "texture",
        "banner": "poster",
        "card": "label",
    }

    # Build English keyword list (keep design terms, remove only suffix noise)
    en_words = re.findall(r"[a-zA-Z]+", prompt)
    label_words = [w for w in en_words if w.lower() not in _SUFFIX_NOISE]

    # Translate Korean words to English
    ko_words = re.findall(r"[가-힣]+", prompt)
    for kw in ko_words:
        en = _KO_EN_MAP.get(kw)
        if en:
            label_words.append(en)
        else:
            for ko, en_val in _KO_EN_MAP.items():
                if ko in kw or kw in ko:
                    label_words.append(en_val)
                    break

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_words: list[str] = []
    for w in label_words:
        if w.lower() not in seen:
            seen.add(w.lower())
            unique_words.append(w)

    # Build candidate list: original keywords + synonyms for 530-prone words
    candidates: list[str] = []
    for w in unique_words[:4]:
        candidates.append(w)
        syn = _SYNONYMS.get(w.lower())
        if syn and syn not in seen:
            candidates.append(syn)

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        for kw in candidates[:6]:
            url = f"https://image.pollinations.ai/prompt/{quote(kw)}"
            try:
                resp = await client.get(url)
                if (resp.status_code == 200
                        and "image" in resp.headers.get("content-type", "")
                        and len(resp.content) > 1000):
                    img_b64 = base64.b64encode(resp.content).decode()
                    ct = resp.headers.get("content-type", "image/jpeg").split(";")[0]
                    logger.info("Pollinations.ai OK for '%s' (%d bytes)", kw, len(resp.content))
                    return {
                        "image_base64": img_b64,
                        "image_url": f"data:{ct};base64,{img_b64}",
                        "method": "pollinations_ai",
                    }
                logger.warning("Pollinations.ai: %d for keyword '%s'", resp.status_code, kw)
            except Exception as exc:
                logger.warning("Pollinations.ai error for '%s': %s", kw, exc)

    # Pollinations blocked all keywords → try DiceBear (design-quality SVG, always works)
    logger.info("Pollinations unavailable — trying DiceBear")
    result = await _dicebear_fetch(unique_words)
    if result.get("image_url"):
        return result

    # Last resort: generate locally
    logger.info("All remote sources failed — generating local SVG preview")
    return _svg_result(prompt, unique_words)


def _svg_result(prompt: str, keywords: list[str]) -> dict:
    """Generate a minimal SVG preview locally (no network required)."""
    import base64
    import hashlib

    color_hex = hashlib.md5(prompt.encode()).hexdigest()[:6]
    label = keywords[0].capitalize() if keywords else "Design"
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">'
        f'<rect width="512" height="512" fill="#{color_hex}"/>'
        f'<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" '
        f'font-family="sans-serif" font-size="40" fill="#fff">{label}</text>'
        f"</svg>"
    )
    img_b64 = base64.b64encode(svg.encode()).decode()
    return {
        "image_base64": img_b64,
        "image_url": f"data:image/svg+xml;base64,{img_b64}",
        "method": "svg_local",
    }


async def _dicebear_fetch(keywords: list[str]) -> dict:
    """Generate a design-quality SVG via DiceBear API (free, no API key).

    Uses 'shapes' style to produce geometric/abstract design visuals.
    Seed is derived from the first keyword so results are consistent per prompt.
    https://www.dicebear.com/styles/shapes/
    """
    import base64

    seed = keywords[0] if keywords else "design"
    # 'shapes' gives clean geometric design visuals; 'icons' gives icon-style output
    styles = ["shapes", "icons"]
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            for style in styles:
                url = (
                    f"https://api.dicebear.com/9.x/{style}/svg"
                    f"?seed={quote(seed)}&size=512&radius=12"
                )
                resp = await client.get(url)
                if resp.status_code == 200 and len(resp.content) > 200:
                    img_b64 = base64.b64encode(resp.content).decode()
                    logger.info("DiceBear OK (%s, seed=%s)", style, seed)
                    return {
                        "image_base64": img_b64,
                        "image_url": f"data:image/svg+xml;base64,{img_b64}",
                        "method": "dicebear",
                    }
                logger.warning("DiceBear: %d for style=%s", resp.status_code, style)
    except Exception as exc:
        logger.warning("DiceBear error: %s", exc)
    return {}


async def _hf_inference_result(prompt: str) -> dict:
    """Generate image via HuggingFace Inference API (free with HF_TOKEN).

    Get a free token at: https://huggingface.co/settings/tokens
    Default model: FLUX.1-schnell (fast, high quality).
    """
    import base64
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"https://router.huggingface.co/hf-inference/models/{HF_MODEL}",
                headers={
                    "Authorization": f"Bearer {HF_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={"inputs": prompt},
            )
            if resp.status_code == 200 and "image" in resp.headers.get("content-type", ""):
                img_b64 = base64.b64encode(resp.content).decode()
                ct = resp.headers.get("content-type", "image/jpeg").split(";")[0]
                return {
                    "image_base64": img_b64,
                    "image_url": f"data:{ct};base64,{img_b64}",
                    "method": "huggingface",
                    "model": HF_MODEL,
                }
            logger.warning("HuggingFace returned %d: %s", resp.status_code, resp.text[:100])
    except Exception as exc:
        logger.error("HuggingFace error: %s", exc)
    return {}


async def _stable_horde_result(prompt: str, timeout: float = 120.0) -> dict:
    """Generate image via Stable Horde (free crowdsourced Stable Diffusion).

    Uses anonymous key by default; set STABLE_HORDE_API_KEY for priority queue.
    https://stablehorde.net/
    """
    headers = {"apikey": STABLE_HORDE_KEY, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{STABLE_HORDE_URL}/generate/async",
                headers=headers,
                json={
                    "prompt": prompt,
                    "params": {
                        "width": 512,
                        "height": 512,
                        "steps": 20,
                        "cfg_scale": 7,
                        "sampler_name": "k_dpmpp_2m",
                    },
                    "models": ["stable_diffusion"],
                    "r2": False,
                    "nsfw": False,
                    "censor_nsfw": True,
                },
            )
        if resp.status_code != 202:
            logger.warning("Stable Horde queue failed: %d", resp.status_code)
            return {}
        job_id = resp.json()["id"]
        logger.info("Stable Horde job queued: %s", job_id)
    except Exception as exc:
        logger.error("Stable Horde queue error: %s", exc)
        return {}

    # Poll until done
    deadline = asyncio.get_event_loop().time() + timeout
    async with httpx.AsyncClient(timeout=15.0) as client:
        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(5.0)
            try:
                check = await client.get(
                    f"{STABLE_HORDE_URL}/generate/check/{job_id}",
                    headers=headers,
                )
                check_data = check.json()
                wait_time = check_data.get("wait_time", "?")
                logger.info("Stable Horde wait_time=%s done=%s", wait_time, check_data.get("done"))
                if check_data.get("done"):
                    status = await client.get(
                        f"{STABLE_HORDE_URL}/generate/status/{job_id}",
                        headers=headers,
                    )
                    gens = status.json().get("generations", [])
                    if gens:
                        img_b64 = gens[0].get("img", "")
                        if img_b64:
                            return {
                                "image_base64": img_b64,
                                "image_url": f"data:image/webp;base64,{img_b64}",
                                "method": "stable_horde",
                            }
                    break
            except Exception as exc:
                logger.warning("Stable Horde poll error: %s", exc)

    logger.warning("Stable Horde timed out or returned no image")
    return {}


# Keep for backwards compatibility with tests
def _placeholder_result(prompt: str) -> dict:
    """Return a static placeholder image (placehold.co). Used when all AI sources are unavailable."""
    import hashlib
    color_hex = hashlib.md5(prompt.encode()).hexdigest()[:6]
    url = f"https://placehold.co/512x512/{color_hex}/ffffff?text=Design+Preview"
    return {
        "image_base64": None,
        "image_url": url,
        "method": "placeholder",
    }
