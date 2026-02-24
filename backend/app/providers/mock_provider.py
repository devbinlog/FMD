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

    # Music / Instrument
    {"title": "Music & Instrument Icon Set", "seed": "music-icons", "category": "icon", "price": 22000, "color_hex": "#6366f1", "tags": ["icon", "music", "instrument", "guitar", "piano", "drum", "note", "audio"]},
    {"title": "Jazz Poster Template Bundle", "seed": "jazz-poster", "category": "illustration", "price": 31000, "color_hex": "#1e1b4b", "tags": ["illustration", "music", "jazz", "poster", "instrument", "vintage", "dark", "concert"]},
    {"title": "Music App UI Kit", "seed": "music-app", "category": "ui", "price": 58000, "color_hex": "#7c3aed", "tags": ["ui", "music", "app", "mobile", "player", "audio", "purple", "streaming"]},
    {"title": "Vinyl Record & Audio Branding Kit", "seed": "vinyl-brand", "category": "logo", "price": 37000, "color_hex": "#111827", "tags": ["logo", "music", "vinyl", "record", "audio", "brand", "dark", "instrument"]},

    # Food & Restaurant
    {"title": "Restaurant Menu Template", "seed": "restaurant-menu", "category": "ui", "price": 45000, "color_hex": "#b45309", "tags": ["ui", "food", "restaurant", "menu", "dining", "brown", "cafe", "drink"]},
    {"title": "Food Delivery App UI Kit", "seed": "food-delivery", "category": "ui", "price": 79000, "color_hex": "#ef4444", "tags": ["ui", "food", "delivery", "app", "mobile", "red", "order", "restaurant"]},
    {"title": "Cafe & Coffee Brand Identity", "seed": "cafe-brand", "category": "logo", "price": 55000, "color_hex": "#78350f", "tags": ["logo", "cafe", "coffee", "food", "brand", "brown", "warm", "minimal"]},
    {"title": "Food Illustration Pack", "seed": "food-illust", "category": "illustration", "price": 28000, "color_hex": "#f59e0b", "tags": ["illustration", "food", "fruit", "vegetable", "yellow", "cute", "flat"]},

    # Fashion & Clothing
    {"title": "Fashion Brand Identity Kit", "seed": "fashion-brand", "category": "logo", "price": 88000, "color_hex": "#111827", "tags": ["logo", "fashion", "clothing", "brand", "luxury", "dark", "elegant", "minimal"]},
    {"title": "Clothing Store UI Template", "seed": "fashion-ui", "category": "ui", "price": 72000, "color_hex": "#f9fafb", "tags": ["ui", "fashion", "clothing", "shop", "ecommerce", "minimal", "white", "store"]},
    {"title": "Fashion Illustration Collection", "seed": "fashion-illust", "category": "illustration", "price": 42000, "color_hex": "#ec4899", "tags": ["illustration", "fashion", "clothing", "woman", "style", "pink", "drawing"]},

    # Travel
    {"title": "Travel App UI Kit", "seed": "travel-app", "category": "ui", "price": 69000, "color_hex": "#0ea5e9", "tags": ["ui", "travel", "app", "mobile", "map", "blue", "trip", "tourism", "airplane"]},
    {"title": "Travel & Adventure Icon Pack", "seed": "travel-icons", "category": "icon", "price": 21000, "color_hex": "#0284c7", "tags": ["icon", "travel", "airplane", "map", "tourism", "adventure", "blue", "trip"]},
    {"title": "Tourism Brand Logo Bundle", "seed": "travel-logo", "category": "logo", "price": 33000, "color_hex": "#0369a1", "tags": ["logo", "travel", "tourism", "brand", "blue", "mountain", "nature"]},
    {"title": "World Map Illustration Set", "seed": "map-illust", "category": "illustration", "price": 26000, "color_hex": "#06b6d4", "tags": ["illustration", "map", "travel", "world", "geography", "cyan", "country"]},

    # Sports & Fitness
    {"title": "Sports Logo Template Pack", "seed": "sports-logo", "category": "logo", "price": 38000, "color_hex": "#dc2626", "tags": ["logo", "sports", "soccer", "basketball", "baseball", "team", "red", "bold"]},
    {"title": "Fitness App UI Kit", "seed": "fitness-app", "category": "ui", "price": 65000, "color_hex": "#16a34a", "tags": ["ui", "fitness", "health", "app", "mobile", "green", "workout", "sports", "gym"]},
    {"title": "Sports & Fitness Icon Set", "seed": "sports-icons", "category": "icon", "price": 19000, "color_hex": "#f97316", "tags": ["icon", "sports", "fitness", "gym", "run", "orange", "soccer", "basketball"]},

    # Technology & Startup
    {"title": "Tech Startup Brand Kit", "seed": "tech-brand", "category": "logo", "price": 95000, "color_hex": "#2563eb", "tags": ["logo", "tech", "startup", "brand", "blue", "modern", "digital", "software"]},
    {"title": "SaaS Landing Page Template", "seed": "saas-landing", "category": "ui", "price": 85000, "color_hex": "#4f46e5", "tags": ["ui", "saas", "landing", "startup", "tech", "purple", "modern", "web"]},
    {"title": "Tech & Digital Icon Collection", "seed": "tech-icons", "category": "icon", "price": 29000, "color_hex": "#0ea5e9", "tags": ["icon", "tech", "digital", "computer", "phone", "blue", "software", "cloud"]},
    {"title": "AI & Robot Illustration Pack", "seed": "ai-illust", "category": "illustration", "price": 48000, "color_hex": "#6366f1", "tags": ["illustration", "ai", "robot", "tech", "digital", "purple", "futuristic"]},

    # Nature & Environment
    {"title": "Nature & Eco Logo Bundle", "seed": "eco-logo", "category": "logo", "price": 32000, "color_hex": "#15803d", "tags": ["logo", "nature", "eco", "green", "leaf", "tree", "plant", "environment"]},
    {"title": "Nature Landscape Illustration Set", "seed": "nature-illust", "category": "illustration", "price": 36000, "color_hex": "#16a34a", "tags": ["illustration", "nature", "landscape", "mountain", "forest", "green", "sky", "tree"]},
    {"title": "Plant & Flower Icon Pack", "seed": "plant-icons", "category": "icon", "price": 17000, "color_hex": "#22c55e", "tags": ["icon", "plant", "flower", "nature", "leaf", "green", "botanical", "eco"]},

    # Animal & Pet
    {"title": "Cute Animal Illustration Bundle", "seed": "animal-illust", "category": "illustration", "price": 33000, "color_hex": "#f59e0b", "tags": ["illustration", "animal", "cute", "cat", "dog", "bear", "cartoon", "yellow"]},
    {"title": "Pet Care Brand Identity", "seed": "pet-brand", "category": "logo", "price": 41000, "color_hex": "#f97316", "tags": ["logo", "pet", "animal", "cat", "dog", "brand", "cute", "orange", "care"]},
    {"title": "Animal & Wildlife Icon Set", "seed": "animal-icons", "category": "icon", "price": 20000, "color_hex": "#78350f", "tags": ["icon", "animal", "cat", "dog", "bird", "fish", "bear", "wild", "lion", "tiger"]},

    # Medical & Health
    {"title": "Medical & Health Icon Pack", "seed": "medical-icons", "category": "icon", "price": 24000, "color_hex": "#0891b2", "tags": ["icon", "medical", "health", "hospital", "doctor", "blue", "care", "pharmacy"]},
    {"title": "Healthcare App UI Kit", "seed": "health-app", "category": "ui", "price": 82000, "color_hex": "#0d9488", "tags": ["ui", "health", "medical", "app", "mobile", "teal", "doctor", "hospital", "care"]},
    {"title": "Medical Brand Identity Kit", "seed": "medical-brand", "category": "logo", "price": 60000, "color_hex": "#0284c7", "tags": ["logo", "medical", "health", "hospital", "brand", "blue", "clinic", "care"]},

    # Education
    {"title": "Education App UI Kit", "seed": "edu-app", "category": "ui", "price": 71000, "color_hex": "#7c3aed", "tags": ["ui", "education", "app", "school", "learning", "purple", "mobile", "study"]},
    {"title": "School & Education Icon Set", "seed": "edu-icons", "category": "icon", "price": 18000, "color_hex": "#6d28d9", "tags": ["icon", "education", "school", "book", "pen", "purple", "study", "learn"]},
    {"title": "E-learning Platform Template", "seed": "elearning", "category": "ui", "price": 93000, "color_hex": "#4338ca", "tags": ["ui", "education", "elearning", "online", "course", "indigo", "web", "study"]},

    # Game & Entertainment
    {"title": "Game UI Kit — Mobile RPG", "seed": "game-ui", "category": "ui", "price": 110000, "color_hex": "#1e1b4b", "tags": ["ui", "game", "mobile", "rpg", "dark", "fantasy", "entertainment", "indigo"]},
    {"title": "Game Logo & Badge Pack", "seed": "game-logo", "category": "logo", "price": 52000, "color_hex": "#7c3aed", "tags": ["logo", "game", "badge", "esports", "purple", "bold", "entertainment", "gaming"]},
    {"title": "Game Character Illustration Set", "seed": "game-char", "category": "illustration", "price": 67000, "color_hex": "#dc2626", "tags": ["illustration", "game", "character", "fantasy", "anime", "red", "hero", "cartoon"]},

    # Social Media & Marketing
    {"title": "Social Media Post Template Pack", "seed": "social-media", "category": "ui", "price": 39000, "color_hex": "#ec4899", "tags": ["ui", "social", "media", "instagram", "template", "pink", "marketing", "post"]},
    {"title": "Marketing & Ad Banner Kit", "seed": "ad-banner", "category": "illustration", "price": 44000, "color_hex": "#f59e0b", "tags": ["illustration", "marketing", "banner", "ad", "promotion", "yellow", "sale"]},

    # Typography & Font
    {"title": "Display Font & Typography Pack", "seed": "typography", "category": "ui", "price": 56000, "color_hex": "#111827", "tags": ["typography", "font", "type", "display", "dark", "minimal", "text", "headline"]},

    # Wedding & Event
    {"title": "Wedding Invitation Template Set", "seed": "wedding", "category": "illustration", "price": 27000, "color_hex": "#fce7f3", "tags": ["illustration", "wedding", "invitation", "event", "pink", "floral", "elegant", "romantic"]},
    {"title": "Event & Party Poster Bundle", "seed": "event-poster", "category": "illustration", "price": 23000, "color_hex": "#7c3aed", "tags": ["illustration", "event", "party", "poster", "purple", "festive", "birthday", "concert"]},

    # Real Estate & Architecture
    {"title": "Real Estate Brand Identity Kit", "seed": "realestate-brand", "category": "logo", "price": 78000, "color_hex": "#1e3a5f", "tags": ["logo", "realestate", "architecture", "building", "house", "brand", "navy", "property"]},
    {"title": "Property Listing App UI Kit", "seed": "realestate-app", "category": "ui", "price": 91000, "color_hex": "#0369a1", "tags": ["ui", "realestate", "property", "house", "app", "mobile", "blue", "listing", "building"]},
    {"title": "Architecture & Interior Icon Pack", "seed": "arch-icons", "category": "icon", "price": 22000, "color_hex": "#78716c", "tags": ["icon", "architecture", "interior", "house", "building", "design", "gray", "home"]},

    # Finance & Banking
    {"title": "Finance Dashboard UI Kit", "seed": "finance-dashboard", "category": "ui", "price": 97000, "color_hex": "#1d4ed8", "tags": ["ui", "finance", "banking", "dashboard", "chart", "blue", "money", "analytics", "investment"]},
    {"title": "FinTech App UI Template", "seed": "fintech-app", "category": "ui", "price": 86000, "color_hex": "#0f172a", "tags": ["ui", "finance", "fintech", "banking", "app", "dark", "money", "wallet", "payment"]},
    {"title": "Financial Brand Logo Bundle", "seed": "finance-logo", "category": "logo", "price": 62000, "color_hex": "#1e40af", "tags": ["logo", "finance", "bank", "money", "brand", "blue", "trust", "corporate"]},

    # Automotive & Car
    {"title": "Automotive Brand Identity Kit", "seed": "auto-brand", "category": "logo", "price": 73000, "color_hex": "#111827", "tags": ["logo", "car", "automotive", "vehicle", "brand", "dark", "speed", "modern"]},
    {"title": "Car Rental App UI Kit", "seed": "car-app", "category": "ui", "price": 68000, "color_hex": "#ef4444", "tags": ["ui", "car", "rental", "automotive", "app", "mobile", "red", "vehicle", "transport"]},

    # Space & Science
    {"title": "Space & Astronomy Illustration Pack", "seed": "space-illust", "category": "illustration", "price": 44000, "color_hex": "#0f172a", "tags": ["illustration", "space", "astronomy", "star", "planet", "galaxy", "dark", "science", "moon"]},
    {"title": "Science & Lab Icon Collection", "seed": "science-icons", "category": "icon", "price": 21000, "color_hex": "#7c3aed", "tags": ["icon", "science", "lab", "chemistry", "research", "purple", "education", "atom"]},

    # Holiday & Seasonal
    {"title": "Christmas Holiday Illustration Bundle", "seed": "christmas", "category": "illustration", "price": 29000, "color_hex": "#dc2626", "tags": ["illustration", "christmas", "holiday", "santa", "snow", "red", "winter", "festive", "tree"]},
    {"title": "Halloween Icon & Sticker Pack", "seed": "halloween", "category": "icon", "price": 16000, "color_hex": "#ea580c", "tags": ["icon", "halloween", "ghost", "pumpkin", "orange", "dark", "horror", "spooky", "holiday"]},
    {"title": "New Year Celebration Template", "seed": "newyear", "category": "illustration", "price": 24000, "color_hex": "#fbbf24", "tags": ["illustration", "newyear", "celebration", "firework", "gold", "yellow", "party", "festive"]},

    # Summer & Beach
    {"title": "Summer Beach Illustration Set", "seed": "summer-beach", "category": "illustration", "price": 31000, "color_hex": "#f59e0b", "tags": ["illustration", "summer", "beach", "tropical", "ocean", "yellow", "vacation", "sun"]},
    {"title": "Tropical Pattern & Background Pack", "seed": "tropical-pattern", "category": "illustration", "price": 19000, "color_hex": "#10b981", "tags": ["illustration", "tropical", "pattern", "summer", "leaf", "green", "exotic", "floral"]},

    # Winter & Snow
    {"title": "Winter Wonderland Illustration Bundle", "seed": "winter-illust", "category": "illustration", "price": 27000, "color_hex": "#bfdbfe", "tags": ["illustration", "winter", "snow", "cold", "blue", "ice", "seasonal", "cozy"]},

    # Photography & Camera
    {"title": "Photography Portfolio Website Template", "seed": "photo-portfolio", "category": "ui", "price": 64000, "color_hex": "#111827", "tags": ["ui", "photography", "portfolio", "camera", "dark", "minimal", "website", "photo"]},
    {"title": "Camera & Photography Icon Set", "seed": "camera-icons", "category": "icon", "price": 18000, "color_hex": "#374151", "tags": ["icon", "camera", "photography", "photo", "gray", "lens", "picture", "media"]},

    # Interior Design & Home
    {"title": "Interior Design Brand Kit", "seed": "interior-brand", "category": "logo", "price": 66000, "color_hex": "#d6d3d1", "tags": ["logo", "interior", "home", "design", "furniture", "minimal", "warm", "decor"]},
    {"title": "Home Decor App UI Kit", "seed": "home-app", "category": "ui", "price": 76000, "color_hex": "#a78bfa", "tags": ["ui", "home", "interior", "decor", "app", "furniture", "purple", "lifestyle", "design"]},

    # Podcast & Media
    {"title": "Podcast Cover Art Template Pack", "seed": "podcast", "category": "illustration", "price": 32000, "color_hex": "#7c3aed", "tags": ["illustration", "podcast", "media", "audio", "cover", "purple", "broadcast", "radio"]},
    {"title": "Media & Broadcast Brand Identity", "seed": "media-brand", "category": "logo", "price": 57000, "color_hex": "#dc2626", "tags": ["logo", "media", "broadcast", "tv", "radio", "podcast", "red", "entertainment"]},

    # Crypto & NFT
    {"title": "Crypto & Blockchain UI Kit", "seed": "crypto-ui", "category": "ui", "price": 88000, "color_hex": "#f59e0b", "tags": ["ui", "crypto", "blockchain", "bitcoin", "nft", "yellow", "finance", "digital", "web3"]},
    {"title": "NFT Art Collection Branding", "seed": "nft-brand", "category": "logo", "price": 72000, "color_hex": "#8b5cf6", "tags": ["logo", "nft", "crypto", "art", "digital", "purple", "modern", "web3", "collectible"]},

    # 3D & Gradient Design
    {"title": "3D Gradient Object Illustration Pack", "seed": "3d-gradient", "category": "illustration", "price": 53000, "color_hex": "#ec4899", "tags": ["illustration", "3d", "gradient", "object", "pink", "modern", "abstract", "render"]},
    {"title": "Glassmorphism UI Component Kit", "seed": "glass-ui", "category": "ui", "price": 61000, "color_hex": "#6366f1", "tags": ["ui", "glassmorphism", "glass", "modern", "component", "purple", "transparent", "blur"]},
    {"title": "Neon & Dark Theme Icon Pack", "seed": "neon-icons", "category": "icon", "price": 26000, "color_hex": "#22d3ee", "tags": ["icon", "neon", "dark", "glow", "cyan", "modern", "tech", "gaming", "electric"]},

    # Anime & Character
    {"title": "Anime Character Illustration Bundle", "seed": "anime-char", "category": "illustration", "price": 47000, "color_hex": "#f472b6", "tags": ["illustration", "anime", "character", "cute", "japanese", "pink", "manga", "cartoon"]},
    {"title": "Chibi & Kawaii Sticker Pack", "seed": "kawaii-sticker", "category": "icon", "price": 14000, "color_hex": "#fb7185", "tags": ["icon", "kawaii", "cute", "chibi", "sticker", "pink", "anime", "emoji", "japanese"]},

    # HR & Business
    {"title": "Corporate Presentation Template", "seed": "corp-ppt", "category": "ui", "price": 54000, "color_hex": "#1e40af", "tags": ["ui", "corporate", "presentation", "business", "slide", "blue", "professional", "office"]},
    {"title": "HR & Recruitment Brand Kit", "seed": "hr-brand", "category": "logo", "price": 48000, "color_hex": "#0d9488", "tags": ["logo", "hr", "recruitment", "business", "brand", "teal", "corporate", "people"]},
    {"title": "Business Infographic Template Bundle", "seed": "infographic", "category": "illustration", "price": 38000, "color_hex": "#2563eb", "tags": ["illustration", "infographic", "business", "chart", "data", "blue", "corporate", "report"]},

    # Beauty & Cosmetics
    {"title": "Beauty & Cosmetics Brand Identity", "seed": "beauty-brand", "category": "logo", "price": 69000, "color_hex": "#f9a8d4", "tags": ["logo", "beauty", "cosmetics", "makeup", "skincare", "pink", "luxury", "brand", "elegant"]},
    {"title": "Beauty App UI Kit", "seed": "beauty-app", "category": "ui", "price": 77000, "color_hex": "#fbcfe8", "tags": ["ui", "beauty", "cosmetics", "app", "mobile", "pink", "skincare", "makeup", "lifestyle"]},
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
                "image_url": None,
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
