# Requirements

## Functional

### Input
- Text prompt (optional)
- Canvas drawing (optional)
- Category selection (required for canvas)

### Processing
- Create session if not exists
- Create design record
- Trigger processing job
- Generate DesignProfile
- Run provider search
- Rank results

### Output
- List of products
- Each product includes:
  - title
  - image_url
  - price
  - outbound product_url
  - explanation (2+ reasons)

---

## Edge Cases
- Empty text + empty canvas → error
- Invalid image type → error
- Provider returns 0 results → empty state UI
- Duplicate design submission → idempotent handling
- Job timeout → failed state
- Rate limit from provider → retry/backoff

---

## Non-Functional
- Deterministic ranking output
- Response time under 3 seconds (excluding heavy processing)
- Idempotent job execution
- Minimal token usage in AI analysis
