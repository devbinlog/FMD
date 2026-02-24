"""Lightweight TF-IDF text embedder — pure Python stdlib only.

No numpy, no sklearn required.
Converts a keyword list into a normalised float vector stored as JSON bytes,
then computes cosine similarity against product title + tags at ranking time.
"""
import json
import math
import re
from collections import Counter


def _tokenize(text: str) -> list[str]:
    """Lowercase and split on non-alpha chars; drop single-char tokens."""
    return [t for t in re.findall(r"[a-zA-Z]+", text.lower()) if len(t) > 1]


def build_query_embedding(keywords: list[str]) -> bytes:
    """Create a TF-IDF-inspired unit vector from a keyword list.

    Returns JSON bytes suitable for storage in DesignProfile.embedding.
    """
    tokens: list[str] = []
    for kw in keywords:
        tokens.extend(_tokenize(kw))

    if not tokens:
        return json.dumps({"terms": [], "vec": []}).encode()

    counts = Counter(tokens)
    # Weight: log(1 + count) gives diminishing returns for repeated terms
    weighted: dict[str, float] = {term: math.log1p(cnt) for term, cnt in counts.items()}

    # Normalise to unit vector so cosine similarity is just a dot product
    magnitude = math.sqrt(sum(v ** 2 for v in weighted.values())) or 1.0
    terms = sorted(weighted.keys())
    vec = [round(weighted[t] / magnitude, 6) for t in terms]

    return json.dumps({"terms": terms, "vec": vec}).encode()


def cosine_similarity(embedding_bytes: bytes, title: str, tags: list[str]) -> float:
    """Compute cosine similarity between a stored query embedding and product text.

    Args:
        embedding_bytes: value from DesignProfile.embedding (JSON bytes)
        title: product title string
        tags: product tags list

    Returns:
        float in [0.0, 1.0]
    """
    try:
        payload = json.loads(embedding_bytes.decode())
        q_terms: list[str] = payload["terms"]
        q_vec: list[float] = payload["vec"]
    except Exception:
        return 0.0

    if not q_terms:
        return 0.0

    # Build product token bag aligned to query vocabulary
    product_text = title + " " + " ".join(tags)
    product_tokens = _tokenize(product_text)
    if not product_tokens:
        return 0.0

    p_counts = Counter(product_tokens)
    # Same weighting scheme as query embedding
    p_weighted = [math.log1p(p_counts.get(term, 0)) for term in q_terms]
    p_mag = math.sqrt(sum(v ** 2 for v in p_weighted)) or 1.0
    p_vec_norm = [v / p_mag for v in p_weighted]

    # Dot product of two unit vectors = cosine similarity
    dot = sum(q * p for q, p in zip(q_vec, p_vec_norm))
    return round(max(0.0, min(1.0, dot)), 4)
