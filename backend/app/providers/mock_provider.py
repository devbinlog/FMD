"""Mock provider — serves the 200-item curated design reference dataset.

Keyword matching: score each item by tag overlap with query keywords.
Category filter: hard-filter when category is given, then score by tags.
ranking.py re-ranks by keyword + color + embedding scores afterward.
"""
import re

from app.data.design_refs import DESIGN_REFS
from app.providers.base import BaseProvider


class MockProvider(BaseProvider):
    provider_id = "mock"

    async def search(
        self,
        keywords: list[str],
        dominant_color: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[dict]:
        # Normalize query keywords to lowercase English
        en_kws = [k.lower() for k in keywords if re.match(r"[a-zA-Z]", k)]
        kw_set = set(en_kws)

        scored: list[tuple[float, dict]] = []

        for item in DESIGN_REFS:
            item_cat = item.get("category", "")
            tag_set = {t.lower() for t in item.get("tags", [])}
            title_words = {w.lower() for w in re.findall(r"[a-zA-Z]+", item.get("title", ""))}

            # Hard filter: if category specified, skip non-matching categories
            if category and category.lower() not in (item_cat, *tag_set):
                # Still include if multiple tags match strongly
                kw_overlap = len(kw_set & (tag_set | title_words))
                if kw_overlap < 3:
                    continue

            # Score: weighted tag overlap
            kw_overlap = len(kw_set & (tag_set | title_words))
            cat_bonus = 2.0 if category and category.lower() == item_cat else 0.0
            score = kw_overlap + cat_bonus

            scored.append((score, item))

        # Sort by score descending; stable tie-break by original order
        scored.sort(key=lambda x: -x[0])

        # Return as plain dicts (exclude internal 'category' field from results)
        results = []
        for _, item in scored[:limit]:
            results.append({
                "title": item["title"],
                "image_url": item.get("image_url"),
                "product_url": item.get("product_url"),
                "price": item.get("price"),
                "color_hex": item.get("color_hex"),
                "tags": item.get("tags", []),
            })

        return results
