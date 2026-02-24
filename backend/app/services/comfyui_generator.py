"""ComfyUI integration for FMD — runs SDXL workflows via ComfyUI's REST API.

ComfyUI exposes a JSON-based workflow API at /prompt and /history.
Set COMFYUI_URL (default: http://localhost:8188) to connect.

Supported experiments:
- SDXL text-to-image with configurable CFG / steps / seed
- ControlNet (Canny edge) conditioning from a canvas image
"""
import asyncio
import base64
import logging
import os
import uuid
from typing import Optional

import httpx

logger = logging.getLogger("fmd.comfyui")

COMFYUI_URL = os.getenv("COMFYUI_URL", "http://localhost:8188")

# ---------------------------------------------------------------------------
# SDXL base workflow (node IDs are stable strings for easy patching)
# ---------------------------------------------------------------------------

def _build_sdxl_workflow(
    prompt: str,
    negative_prompt: str = "blurry, low quality, text, watermark, deformed",
    cfg: float = 7.0,
    steps: int = 20,
    seed: int = 42,
    width: int = 1024,
    height: int = 1024,
) -> dict:
    """Return a ComfyUI API-format workflow dict for SDXL text-to-image."""
    return {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"},
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": prompt,
                "clip": ["1", 1],
            },
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": negative_prompt,
                "clip": ["1", 1],
            },
        },
        "4": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": width, "height": height, "batch_size": 1},
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 1.0,
            },
        },
        "6": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["5", 0],
                "vae": ["1", 2],
            },
        },
        "7": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["6", 0],
                "filename_prefix": "fmd_sdxl",
            },
        },
    }


def _build_controlnet_workflow(
    prompt: str,
    control_image_b64: str,
    negative_prompt: str = "blurry, low quality, text, watermark, deformed",
    cfg: float = 7.0,
    steps: int = 20,
    seed: int = 42,
    width: int = 1024,
    height: int = 1024,
    controlnet_strength: float = 0.8,
) -> dict:
    """Return a ComfyUI workflow with Canny ControlNet conditioning."""
    workflow = _build_sdxl_workflow(prompt, negative_prompt, cfg, steps, seed, width, height)

    # Load control image from base64
    workflow["8"] = {
        "class_type": "ETN_LoadImageBase64",
        "inputs": {"image": control_image_b64},
    }
    # Canny preprocessor
    workflow["9"] = {
        "class_type": "CannyEdgePreprocessor",
        "inputs": {
            "image": ["8", 0],
            "low_threshold": 100,
            "high_threshold": 200,
            "resolution": 1024,
        },
    }
    # ControlNet loader (Canny for SDXL)
    workflow["10"] = {
        "class_type": "ControlNetLoader",
        "inputs": {"control_net_name": "controlnet-canny-sdxl-1.0.safetensors"},
    }
    # Apply ControlNet — override KSampler's positive conditioning
    workflow["11"] = {
        "class_type": "ControlNetApplyAdvanced",
        "inputs": {
            "positive": ["2", 0],
            "negative": ["3", 0],
            "control_net": ["10", 0],
            "image": ["9", 0],
            "strength": controlnet_strength,
            "start_percent": 0.0,
            "end_percent": 1.0,
        },
    }
    # Patch KSampler to use ControlNet-conditioned pos/neg
    workflow["5"]["inputs"]["positive"] = ["11", 0]
    workflow["5"]["inputs"]["negative"] = ["11", 1]
    return workflow


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

async def _queue_prompt(workflow: dict, client_id: str) -> Optional[str]:
    """POST workflow to ComfyUI /prompt, return prompt_id."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{COMFYUI_URL}/prompt",
                json={"prompt": workflow, "client_id": client_id},
            )
            resp.raise_for_status()
            return resp.json()["prompt_id"]
    except Exception as exc:
        logger.error("ComfyUI /prompt failed: %s", exc)
        return None


async def _poll_result(prompt_id: str, timeout: float = 120.0) -> Optional[bytes]:
    """Poll /history until image is ready, return PNG bytes."""
    deadline = asyncio.get_event_loop().time() + timeout
    async with httpx.AsyncClient(timeout=10.0) as client:
        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(2.0)
            try:
                resp = await client.get(f"{COMFYUI_URL}/history/{prompt_id}")
                data = resp.json()
                if prompt_id not in data:
                    continue
                outputs = data[prompt_id].get("outputs", {})
                for node_output in outputs.values():
                    images = node_output.get("images", [])
                    for img_info in images:
                        # Fetch image bytes
                        img_resp = await client.get(
                            f"{COMFYUI_URL}/view",
                            params={
                                "filename": img_info["filename"],
                                "subfolder": img_info.get("subfolder", ""),
                                "type": img_info.get("type", "output"),
                            },
                        )
                        if img_resp.status_code == 200:
                            return img_resp.content
            except Exception as exc:
                logger.warning("ComfyUI poll error: %s", exc)
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_via_comfyui(
    prompt: str,
    cfg: float = 7.0,
    steps: int = 20,
    seed: int = 42,
    width: int = 1024,
    height: int = 1024,
    control_image_b64: Optional[str] = None,
) -> dict:
    """Generate an image via ComfyUI (SDXL).

    Returns dict with keys: image_base64, image_url, method, cfg, steps, seed.
    Falls back gracefully if ComfyUI is unavailable.
    """
    client_id = str(uuid.uuid4())

    if control_image_b64:
        workflow = _build_controlnet_workflow(
            prompt, control_image_b64, cfg=cfg, steps=steps, seed=seed,
            width=width, height=height,
        )
        method = "comfyui_sdxl_controlnet"
    else:
        workflow = _build_sdxl_workflow(
            prompt, cfg=cfg, steps=steps, seed=seed, width=width, height=height,
        )
        method = "comfyui_sdxl"

    prompt_id = await _queue_prompt(workflow, client_id)
    if not prompt_id:
        logger.warning("ComfyUI unavailable, skipping")
        return {"image_base64": None, "image_url": None, "method": method, "error": "ComfyUI unavailable"}

    image_bytes = await _poll_result(prompt_id)
    if not image_bytes:
        return {"image_base64": None, "image_url": None, "method": method, "error": "timeout"}

    b64 = base64.b64encode(image_bytes).decode()
    return {
        "image_base64": b64,
        "image_url": f"data:image/png;base64,{b64}",
        "method": method,
        "cfg": cfg,
        "steps": steps,
        "seed": seed,
    }


async def is_comfyui_available() -> bool:
    """Quick health-check for ComfyUI server."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{COMFYUI_URL}/system_stats")
            return resp.status_code == 200
    except Exception:
        return False
