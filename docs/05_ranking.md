# Ranking v1

## Signals

kw_score (0..1)
- Keyword match in product title

color_score (0..1)
- Dominant color similarity

embedding_score (0..1)
- Cosine similarity if available

meta_score (0..1)
- Image presence
- URL duplication penalty

---

## Aggregation

If embedding available:
overall = 0.55*embedding + 0.20*color + 0.20*kw + 0.05*meta

Else:
overall = 0.45*color + 0.45*kw + 0.10*meta

---

## Penalties
- negative keyword match → overall * 0.6
- no image → overall * 0.8
- duplicate URL → overall * 0.9

---

## Explanation Rules
Include at least 2:
- "visual similarity"
- "color match"
- "keyword match"
