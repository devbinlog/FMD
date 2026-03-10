"""Ranking v1 — pure function implementation per docs/05_ranking.md

Weights are injectable via RankingWeights so that:
  - Unit tests can supply custom weights without monkey-patching
  - The Config Studio admin panel can pass live-edited weights per request
  - A/B experiments can assign different RankingWeights instances per session
"""
from dataclasses import dataclass

from app.services.embedder import cosine_similarity as _cosine_similarity


@dataclass
class RankingWeights:
    """Scoring weights for the multi-signal ranking function.

    With embedding (sum must be 1.0):
        w_embedding + w_color + w_keyword + w_meta = 1.0

    Without embedding (sum must be 1.0):
        w_color_noem + w_keyword_noem + w_meta_noem = 1.0

    Penalty multipliers are applied after the base score.
    """
    # ── With embedding ────────────────────────────────────────────────────
    w_embedding: float = 0.55
    w_color: float = 0.20
    w_keyword: float = 0.20
    w_meta: float = 0.05

    # ── Without embedding (fallback) ──────────────────────────────────────
    w_color_noem: float = 0.45
    w_keyword_noem: float = 0.45
    w_meta_noem: float = 0.10

    # ── Penalties (multiplicative) ────────────────────────────────────────
    p_negative_kw: float = 0.6
    p_duplicate_url: float = 0.9


DEFAULT_WEIGHTS = RankingWeights()


def _keyword_score(title: str, tags: list[str], keywords: list[str]) -> float:
    if not keywords:
        return 0.0
    title_lower = title.lower()
    tags_lower = [t.lower() for t in tags]
    matches = 0
    for kw in keywords:
        kw_lower = kw.lower()
        if kw_lower in title_lower or kw_lower in tags_lower:
            matches += 1
    return min(matches / max(len(keywords), 1), 1.0)


def _color_score(product_color: str | None, dominant_color: str | None) -> float:
    if not product_color or not dominant_color:
        return 0.0
    try:
        pr = int(product_color[1:3], 16)
        pg = int(product_color[3:5], 16)
        pb = int(product_color[5:7], 16)
        dr = int(dominant_color[1:3], 16)
        dg = int(dominant_color[3:5], 16)
        db = int(dominant_color[5:7], 16)
    except (ValueError, IndexError):
        return 0.0

    distance = ((pr - dr) ** 2 + (pg - dg) ** 2 + (pb - db) ** 2) ** 0.5
    max_distance = (255**2 * 3) ** 0.5  # ~441.67
    return max(1.0 - distance / max_distance, 0.0)


def _meta_score(image_url: str | None, product_url: str | None, seen_urls: set) -> float:
    score = 1.0
    if not image_url:
        score *= 0.8
    if product_url and product_url in seen_urls:
        score *= 0.9
    return score


def _has_negative_keyword(title: str, tags: list[str], negative_keywords: list[str]) -> bool:
    if not negative_keywords:
        return False
    title_lower = title.lower()
    tags_lower = [t.lower() for t in tags]
    for nk in negative_keywords:
        nk_lower = nk.lower()
        if nk_lower in title_lower or nk_lower in tags_lower:
            return True
    return False


def _build_explanation(kw_score: float, color_score: float, embedding_score: float) -> list[str]:
    reasons = []
    if embedding_score > 0.3:
        reasons.append("visual similarity")
    if color_score > 0.3:
        reasons.append("color match")
    if kw_score > 0.3:
        reasons.append("keyword match")
    # Ensure at least 2 reasons
    if len(reasons) < 2:
        for fallback in ["keyword match", "color match", "visual similarity"]:
            if fallback not in reasons:
                reasons.append(fallback)
            if len(reasons) >= 2:
                break
    return reasons


def rank_results(
    raw_results: list[dict],
    keywords: list[str],
    negative_keywords: list[str],
    dominant_color: str | None,
    embedding: bytes | None = None,
    weights: RankingWeights = DEFAULT_WEIGHTS,
) -> list[dict]:
    """Rank raw provider results per docs/05_ranking.md algorithm.

    Args:
        raw_results:       Candidates from all providers. Each item must have:
                           title, image_url, product_url, price, color_hex,
                           tags, search_run_id
        keywords:          Positive keywords from the DesignProfile.
        negative_keywords: Keywords whose presence penalises a result.
        dominant_color:    Hex color from the DesignProfile.
        embedding:         TF-IDF unit-vector bytes from the DesignProfile.
        weights:           RankingWeights instance. Defaults to DEFAULT_WEIGHTS.
                           Pass a custom instance to run A/B experiments or
                           apply Config-Studio-edited weights per request.
    """
    has_embedding = embedding is not None
    seen_urls: set[str] = set()
    scored = []

    for item in raw_results:
        title = item.get("title", "")
        tags = item.get("tags", [])
        image_url = item.get("image_url")
        product_url = item.get("product_url")
        color_hex = item.get("color_hex")

        kw = _keyword_score(title, tags, keywords)
        color = _color_score(color_hex, dominant_color)
        emb = _cosine_similarity(embedding, title, tags) if embedding else 0.0
        meta = _meta_score(image_url, product_url, seen_urls)

        if product_url:
            seen_urls.add(product_url)

        # ── Aggregation ──────────────────────────────────────────────────
        if has_embedding:
            overall = (
                weights.w_embedding * emb
                + weights.w_color * color
                + weights.w_keyword * kw
                + weights.w_meta * meta
            )
        else:
            overall = (
                weights.w_color_noem * color
                + weights.w_keyword_noem * kw
                + weights.w_meta_noem * meta
            )

        # ── Penalties ────────────────────────────────────────────────────
        if _has_negative_keyword(title, tags, negative_keywords):
            overall *= weights.p_negative_kw
        if product_url and product_url in seen_urls and len(seen_urls) > 1:
            overall *= weights.p_duplicate_url

        explanation = _build_explanation(kw, color, emb)

        scored.append({
            **item,
            "score_overall": round(overall, 4),
            "score_keyword": round(kw, 4),
            "score_color": round(color, 4),
            "score_embedding": round(emb, 4),
            "explanation": explanation,
        })

    scored.sort(key=lambda x: x["score_overall"], reverse=True)
    return scored
