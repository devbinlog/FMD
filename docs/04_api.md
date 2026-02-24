# API Spec (MVP)

## POST /api/sessions
Response:
{
  "session_id": "uuid"
}

---

## POST /api/designs
Request:
{
  "session_id": "uuid",
  "input_mode": "text|canvas",
  "category_hint": "string",
  "text_prompt": "string"
}

Response:
{
  "design_id": "uuid",
  "status": "created"
}

---

## POST /api/designs/{design_id}/process
Response:
{
  "job_id": "uuid",
  "status": "queued"
}

---

## GET /api/jobs/{job_id}
Response:
{
  "status": "queued|running|done|failed",
  "progress": 0.7
}

---

## POST /api/search
Request:
{
  "design_id": "uuid",
  "providers": ["provider1"],
  "limit": 20
}

Response:
{
  "results": [...]
}
