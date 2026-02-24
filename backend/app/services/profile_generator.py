"""Generate a DesignProfile from a Design record.

Supports both text prompt analysis and canvas image analysis.
Handles Korean input by translating keywords to English for marketplace search.
"""
import base64
import hashlib
import io
import re
from collections import Counter


# Korean → English translation map for common design/general terms
_KO_EN_MAP = {
    # Animals
    "고양이": "cat", "강아지": "dog", "개": "dog", "새": "bird", "나비": "butterfly",
    "물고기": "fish", "토끼": "rabbit", "곰": "bear", "사자": "lion", "호랑이": "tiger",
    "말": "horse", "용": "dragon", "여우": "fox", "늑대": "wolf", "펭귄": "penguin",
    # Nature
    "꽃": "flower", "나무": "tree", "숲": "forest", "산": "mountain", "바다": "ocean",
    "하늘": "sky", "별": "star", "달": "moon", "해": "sun", "구름": "cloud",
    "비": "rain", "눈": "snow", "강": "river", "호수": "lake", "잎": "leaf",
    # Design terms
    "로고": "logo", "아이콘": "icon", "배너": "banner", "포스터": "poster",
    "카드": "card", "버튼": "button", "배경": "background", "패턴": "pattern",
    "일러스트": "illustration", "캐릭터": "character", "그래픽": "graphic",
    "타이포": "typography", "레이아웃": "layout", "웹": "web", "앱": "app",
    "모바일": "mobile", "대시보드": "dashboard", "디자인": "design",
    "미니멀": "minimal", "모던": "modern", "빈티지": "vintage", "레트로": "retro",
    "플랫": "flat", "심플": "simple", "귀여운": "cute", "귀엽다": "cute",
    "깔끔한": "clean", "세련된": "elegant", "고급": "premium", "럭셔리": "luxury",
    # Objects
    "집": "house", "건물": "building", "차": "car", "자동차": "car",
    "음식": "food", "커피": "coffee", "책": "book", "음악": "music",
    "카메라": "camera", "전화": "phone", "컴퓨터": "computer", "게임": "game",
    "하트": "heart", "사랑": "love", "사람": "person", "얼굴": "face",
    "악기": "instrument", "기타": "guitar", "피아노": "piano", "드럼": "drum",
    "바이올린": "violin", "트럼펫": "trumpet", "플루트": "flute",
    "시계": "clock", "꽃병": "vase", "의자": "chair", "테이블": "table",
    "가방": "bag", "신발": "shoes", "옷": "clothing", "모자": "hat",
    "태양": "sun", "화살표": "arrow", "체크": "check", "별표": "asterisk",
    "스포츠": "sports", "축구": "soccer", "농구": "basketball", "야구": "baseball",
    "여행": "travel", "지도": "map", "비행기": "airplane", "기차": "train",
    "의료": "medical", "건강": "health", "교육": "education", "학교": "school",
    # Style/mood
    "따뜻한": "warm", "차가운": "cool", "밝은": "bright", "어두운": "dark",
    "부드러운": "soft", "강한": "bold", "재미있는": "fun", "전문적": "professional",
    "자연": "nature", "추상": "abstract", "기하학": "geometric",
    # Categories
    "사진": "photo", "그림": "painting", "스케치": "sketch", "만화": "cartoon",
    "애니": "anime", "수채화": "watercolor", "벡터": "vector", "입체": "3d",
}

# Korean stopwords
_KO_STOPWORDS = {
    "이", "가", "은", "는", "을", "를", "의", "에", "에서", "로", "으로",
    "와", "과", "하고", "이나", "나", "도", "만", "부터", "까지",
    "같은", "있는", "하는", "되는", "된", "한", "할", "하다",
    "것", "수", "등", "좀", "잘", "더", "좀", "매우", "아주",
}

_EN_STOPWORDS = {
    "a", "an", "the", "is", "are", "for", "with", "and", "or",
    "in", "on", "to", "of", "that", "this", "it", "my", "me",
    "want", "need", "like", "looking", "find", "make", "create",
    "please", "would", "could", "should",
}


def generate_profile(
    text_prompt: str | None,
    category: str | None,
    canvas_data: str | None = None,
) -> dict:
    """Return a dict with profile data from text and/or canvas."""
    keywords = _extract_keywords(text_prompt)
    dominant_color = _guess_color_from_text(text_prompt)

    if canvas_data:
        canvas_color = _extract_dominant_color_from_canvas(canvas_data)
        if canvas_color:
            dominant_color = canvas_color
        canvas_keywords = _extract_canvas_keywords(canvas_data)
        keywords.extend(canvas_keywords)

    if category:
        keywords.append(category.lower())

    # Deduplicate preserving order
    keywords = list(dict.fromkeys(keywords))

    raw = f"{','.join(sorted(keywords))}:{dominant_color or ''}"
    profile_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]

    return {
        "profile_hash": profile_hash,
        "profile": {
            "source_text": text_prompt,
            "category": category,
            "has_canvas": canvas_data is not None,
        },
        "keywords": keywords,
        "negative_keywords": [],
        "dominant_color": dominant_color,
    }


def _extract_keywords(text: str | None) -> list[str]:
    if not text:
        return []

    # Extract both English and Korean words
    words = re.findall(r"[a-zA-Z]+|[가-힣]+", text.lower())

    result = []
    for w in words:
        if len(w) <= 1:
            continue
        if w in _EN_STOPWORDS or w in _KO_STOPWORDS:
            continue

        # Translate Korean to English if possible
        if re.match(r"[가-힣]", w):
            en = _KO_EN_MAP.get(w)
            if en:
                result.append(en)
            # Also keep the Korean word for color matching etc.
            result.append(w)
        else:
            result.append(w)

    # If all keywords are Korean with no translations, try substring matching
    en_words = [w for w in result if re.match(r"[a-zA-Z]", w)]
    if not en_words:
        for w in words:
            if re.match(r"[가-힣]", w):
                for ko, en in _KO_EN_MAP.items():
                    if ko in w or w in ko:
                        result.append(en)
                        break

    return list(dict.fromkeys(result))  # dedupe preserving order


_COLOR_MAP = {
    "red": "#ef4444", "blue": "#2563eb", "green": "#10b981",
    "yellow": "#f59e0b", "purple": "#8b5cf6", "pink": "#f472b6",
    "orange": "#f97316", "black": "#111827", "white": "#f9fafb",
    "gray": "#6b7280", "grey": "#6b7280",
    "빨간": "#ef4444", "빨강": "#ef4444", "빨간색": "#ef4444",
    "파란": "#2563eb", "파랑": "#2563eb", "파란색": "#2563eb",
    "초록": "#10b981", "녹색": "#10b981", "초록색": "#10b981",
    "노란": "#f59e0b", "노랑": "#f59e0b", "노란색": "#f59e0b",
    "보라": "#8b5cf6", "보라색": "#8b5cf6",
    "검정": "#111827", "검은": "#111827", "검은색": "#111827", "검정색": "#111827",
    "흰": "#f9fafb", "하얀": "#f9fafb", "흰색": "#f9fafb", "하얀색": "#f9fafb",
    "분홍": "#f472b6", "분홍색": "#f472b6",
    "주황": "#f97316", "주황색": "#f97316",
    "갈색": "#92400e",
}


def _guess_color_from_text(text: str | None) -> str | None:
    if not text:
        return None
    text_lower = text.lower()
    for name, hex_val in _COLOR_MAP.items():
        if name in text_lower:
            return hex_val
    return None


def _extract_dominant_color_from_canvas(canvas_data: str) -> str | None:
    """Extract dominant color from base64 canvas PNG data using Pillow."""
    try:
        from PIL import Image

        if "," in canvas_data:
            canvas_data = canvas_data.split(",", 1)[1]

        img_bytes = base64.b64decode(canvas_data)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        pixels = list(img.getdata())
        non_white = [(r, g, b) for r, g, b in pixels if not (r > 240 and g > 240 and b > 240)]

        if not non_white:
            return None

        quantized = [
            (r // 32 * 32, g // 32 * 32, b // 32 * 32)
            for r, g, b in non_white
        ]
        counter = Counter(quantized)
        most_common = counter.most_common(1)[0][0]

        return f"#{most_common[0]:02x}{most_common[1]:02x}{most_common[2]:02x}"

    except Exception:
        return None


def _extract_canvas_keywords(canvas_data: str) -> list[str]:
    """Extract basic keywords from canvas image properties."""
    keywords = ["sketch", "drawing"]

    color = _extract_dominant_color_from_canvas(canvas_data)
    if color:
        r, g, b = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
        if r > 150 and g < 100 and b < 100:
            keywords.append("red")
        elif r < 100 and g < 100 and b > 150:
            keywords.append("blue")
        elif r < 100 and g > 150 and b < 100:
            keywords.append("green")
        elif r > 150 and g > 150 and b < 100:
            keywords.append("yellow")
        elif r > 150 and g < 100 and b > 150:
            keywords.append("purple")
        elif r < 50 and g < 50 and b < 50:
            keywords.append("dark")

    return keywords
