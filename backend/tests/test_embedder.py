"""Tests for the TF-IDF embedder service."""
import json
import pytest
from app.services.embedder import build_query_embedding, cosine_similarity


def test_same_words_high_similarity():
    emb = build_query_embedding(["blue", "minimal", "logo"])
    score = cosine_similarity(emb, "Minimal Blue Logo", ["blue", "minimal", "logo"])
    assert score > 0.5


def test_no_overlap_low_similarity():
    emb = build_query_embedding(["red", "icon"])
    score = cosine_similarity(emb, "Watercolor Floral Print", ["watercolor", "floral"])
    assert score < 0.1


def test_empty_keywords_returns_zero():
    emb = build_query_embedding([])
    score = cosine_similarity(emb, "Any Title", ["any"])
    assert score == 0.0


def test_embedding_is_bytes():
    emb = build_query_embedding(["logo", "design"])
    assert isinstance(emb, bytes)
    payload = json.loads(emb.decode())
    assert "terms" in payload
    assert "vec" in payload
    assert len(payload["terms"]) == len(payload["vec"])


def test_partial_overlap_gives_intermediate_score():
    emb = build_query_embedding(["blue", "logo", "minimal"])
    full_score = cosine_similarity(emb, "Blue Logo Minimal", ["blue", "logo", "minimal"])
    partial_score = cosine_similarity(emb, "Blue Design Asset", ["blue"])
    assert full_score > partial_score > 0
