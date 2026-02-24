"""Mock provider with keyword-aware filtering and real marketplace links."""
import random
from urllib.parse import quote_plus

from app.providers.base import BaseProvider


# Real design marketplace search templates
_MARKETPLACES = [
    {"name": "Dribbble", "fmt": "https://dribbble.com/search/{q}"},
    {"name": "Behance", "fmt": "https://www.behance.net/search/projects?search={q}"},
    {"name": "Figma Community", "fmt": "https://www.figma.com/community/search?searchTerm={q}&resource_type=mixed"},
    {"name": "Creative Market", "fmt": "https://creativemarket.com/search?q={q}"},
    {"name": "Freepik", "fmt": "https://www.freepik.com/search?format=search&query={q}"},
    {"name": "Envato Elements", "fmt": "https://elements.envato.com/all-items/{q}"},
]

_BASE_PRODUCTS = [
    # UI category
    {"title": "Pastel UI Component Kit", "seed": "pastel-ui", "category": "ui", "price": 49000, "color_hex": "#f472b6", "tags": ["ui", "pastel", "component", "pink", "kit", "design", "web"]},
    {"title": "Modern Dashboard Template", "seed": "dashboard", "category": "ui", "price": 89000, "color_hex": "#6366f1", "tags": ["ui", "dashboard", "modern", "purple", "admin", "analytics"]},
    {"title": "Mobile App UI Kit — Finance", "seed": "finance-app", "category": "ui", "price": 65000, "color_hex": "#10b981", "tags": ["ui", "mobile", "finance", "green", "app", "banking"]},
    {"title": "E-commerce Website Template", "seed": "ecommerce", "category": "ui", "price": 99000, "color_hex": "#ef4444", "tags": ["ui", "ecommerce", "web", "red", "shop", "store"]},
    {"title": "Dark Mode Admin Panel", "seed": "dark-admin", "category": "ui", "price": 75000, "color_hex": "#111827", "tags": ["ui", "dark", "admin", "modern", "panel", "dashboard"]},
    {"title": "Minimal Landing Page", "seed": "landing-page", "category": "ui", "price": 35000, "color_hex": "#2563eb", "tags": ["ui", "minimal", "landing", "blue", "clean", "startup"]},
    # Logo category
    {"title": "Minimal Geometric Logo Pack", "seed": "geometric-logo", "category": "logo", "price": 29000, "color_hex": "#2563eb", "tags": ["logo", "geometric", "minimal", "blue", "brand"]},
    {"title": "Corporate Brand Identity Kit", "seed": "brand-kit", "category": "logo", "price": 120000, "color_hex": "#1e3a5f", "tags": ["logo", "brand", "corporate", "blue", "identity"]},
    {"title": "Vintage Badge Logo Creator", "seed": "vintage-badge", "category": "logo", "price": 22000, "color_hex": "#92400e", "tags": ["logo", "vintage", "badge", "brown", "retro"]},
    {"title": "Gradient Modern Logo Bundle", "seed": "gradient-logo", "category": "logo", "price": 45000, "color_hex": "#8b5cf6", "tags": ["logo", "gradient", "modern", "purple", "tech"]},
    {"title": "Nature & Organic Logo Set", "seed": "nature-logo", "category": "logo", "price": 28000, "color_hex": "#10b981", "tags": ["logo", "nature", "organic", "green", "eco"]},
    # Icon category
    {"title": "Hand-drawn Icon Set", "seed": "handdrawn-icon", "category": "icon", "price": 15000, "color_hex": "#111827", "tags": ["icon", "handdrawn", "sketch", "dark", "doodle"]},
    {"title": "Flat Design Icon Pack (500+)", "seed": "flat-icons", "category": "icon", "price": 25000, "color_hex": "#f59e0b", "tags": ["icon", "flat", "colorful", "yellow", "material"]},
    {"title": "3D Isometric Icon Set", "seed": "3d-icons", "category": "icon", "price": 39000, "color_hex": "#0ea5e9", "tags": ["icon", "3d", "isometric", "blue", "render"]},
    {"title": "Line Art Icon Collection", "seed": "line-icons", "category": "icon", "price": 18000, "color_hex": "#6b7280", "tags": ["icon", "line", "minimal", "gray", "outline"]},
    {"title": "Emoji & Sticker Pack", "seed": "emoji-pack", "category": "icon", "price": 12000, "color_hex": "#f59e0b", "tags": ["icon", "emoji", "sticker", "yellow", "fun"]},
    # Illustration category
    {"title": "Watercolor Illustration Bundle", "seed": "watercolor", "category": "illustration", "price": 35000, "color_hex": "#34d399", "tags": ["illustration", "watercolor", "art", "green", "painting"]},
    {"title": "Abstract Background Collection", "seed": "abstract-bg", "category": "illustration", "price": 19000, "color_hex": "#8b5cf6", "tags": ["illustration", "abstract", "background", "purple"]},
    {"title": "Character Illustration Kit", "seed": "character-kit", "category": "illustration", "price": 55000, "color_hex": "#f472b6", "tags": ["illustration", "character", "people", "pink"]},
    {"title": "Flat Vector Scene Builder", "seed": "vector-scene", "category": "illustration", "price": 42000, "color_hex": "#2563eb", "tags": ["illustration", "flat", "scene", "blue", "vector"]},
    {"title": "Botanical Line Art Prints", "seed": "botanical", "category": "illustration", "price": 23000, "color_hex": "#10b981", "tags": ["illustration", "botanical", "line", "green", "plant"]},
    {"title": "Retro Pattern Collection", "seed": "retro-pattern", "category": "illustration", "price": 16000, "color_hex": "#f97316", "tags": ["illustration", "retro", "pattern", "orange", "vintage"]},
]


class MockProvider(BaseProvider):
    provider_id = "mock"

    async def search(
        self,
        keywords: list[str],
        dominant_color: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[dict]:
        # Filter to English-only keywords for marketplace search
        import re
        en_keywords = [k for k in keywords if re.match(r"[a-zA-Z]", k)]
        kw_set = {k.lower() for k in en_keywords} if en_keywords else set()
        query_str = " ".join(en_keywords[:5]) if en_keywords else "design"

        scored = []
        for i, product in enumerate(_BASE_PRODUCTS):
            tag_set = {t.lower() for t in product["tags"]}
            title_words = {w.lower() for w in product["title"].split()}

            cat_match = 3 if category and category.lower() in tag_set else 0
            kw_overlap = len(kw_set & (tag_set | title_words))
            relevance = cat_match + kw_overlap

            mp = _MARKETPLACES[i % len(_MARKETPLACES)]
            search_q = quote_plus(f"{query_str} {product['title']}")
            product_url = mp["fmt"].replace("{q}", search_q)

            result = {
                "title": product["title"],
                "image_url": f"https://picsum.photos/seed/{product['seed']}/400/300",
                "product_url": product_url,
                "price": product["price"],
                "color_hex": product["color_hex"],
                "tags": product["tags"],
            }
            scored.append((relevance, random.random(), result))

        # Generate dynamic results based on actual keywords
        if en_keywords:
            dynamic = self._generate_dynamic_results(en_keywords, category, query_str)
            for j, item in enumerate(dynamic):
                scored.append((5 + j * 0.1, random.random(), item))

        scored.sort(key=lambda x: (-x[0], x[1]))
        return [item[2] for item in scored[:limit]]

    def _generate_dynamic_results(
        self, keywords: list[str], category: str | None, query_str: str
    ) -> list[dict]:
        """Generate keyword-specific results linking to real marketplace search pages."""
        results = []
        q = quote_plus(query_str)
        cat_label = (category or "Design").capitalize()

        for i, mp in enumerate(_MARKETPLACES[:4]):
            url = mp["fmt"].replace("{q}", q)
            kw_words = [w for w in keywords[:4] if w.lower() != (category or "").lower()]
            title_kw = " ".join(w.capitalize() for w in kw_words[:3])
            title = f"{title_kw} {cat_label} — {mp['name']}"
            seed = f"{mp['name'].lower().replace(' ', '-')}-{i}"

            results.append({
                "title": title,
                "image_url": f"https://picsum.photos/seed/{seed}/400/300",
                "product_url": url,
                "price": 0,
                "color_hex": None,
                "tags": [k.lower() for k in keywords[:6]] + [cat_label.lower()],
            })

        return results
