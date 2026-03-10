# API Spec — Enterprise Console Endpoints

> These endpoints do not yet exist in the current FastAPI backend.
> This document serves as the API contract for future implementation.
> Until implemented, the frontend uses mock adapters from `frontend/src/lib/mock/`.

---

## Base URL
```
/api/admin
```

## Authentication
All console endpoints require `Authorization: Bearer <admin_token>` header.
Role levels: `ADMIN` | `ANALYST` | `VIEWER`

---

## 1. Search Runs

### `GET /api/admin/runs`
List search runs with filtering, sorting, and pagination.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `page_size` | int | Results per page (default: 50, max: 200) |
| `status` | string[] | Filter by job_status (SUCCEEDED\|FAILED\|RUNNING\|QUEUED) |
| `input_mode` | string[] | text\|canvas |
| `category` | string[] | logo, banner, icon, etc. |
| `provider` | string[] | Filter by provider_mix contains |
| `error_code` | string | Exact match on error_code |
| `date_from` | ISO-8601 | created_at >= |
| `date_to` | ISO-8601 | created_at <= |
| `query` | string | Fuzzy search on query_summary |
| `sort_by` | string | Column name (default: created_at) |
| `sort_dir` | asc\|desc | Default: desc |

**Response `200`:**
```json
{
  "total": 1247,
  "page": 1,
  "page_size": 50,
  "items": [
    {
      "run_id": "uuid",
      "design_id": "uuid",
      "job_id": "uuid",
      "session_id": "uuid",
      "created_at": "2026-03-01T12:00:00Z",
      "finished_at": "2026-03-01T12:00:03.8Z",
      "input_mode": "text",
      "category": "logo",
      "query_summary": "minimalist logo with blue tones",
      "keywords": ["logo", "minimalist", "blue"],
      "dominant_color": "#3B82F6",
      "job_status": "SUCCEEDED",
      "duration_ms": 3800,
      "results_count": 12,
      "provider_mix": ["mock", "freepik"],
      "error_code": null,
      "error_message": null,
      "ctr": 1,
      "first_click_rank": 2,
      "feature_flags": ["ranking_weights_v1"]
    }
  ]
}
```

### `GET /api/admin/runs/{run_id}`
Get full run detail including job steps and top results.

**Response `200`:**
```json
{
  "run_id": "uuid",
  "job_steps": [
    {
      "step": 1,
      "label": "Profile Generation",
      "status": "done",
      "started_at": "2026-03-01T12:00:00.100Z",
      "finished_at": "2026-03-01T12:00:00.650Z",
      "duration_ms": 550
    }
  ],
  "top_results": [
    {
      "result_id": "uuid",
      "rank": 1,
      "title": "Premium Logo Bundle",
      "image_url": "https://...",
      "product_url": "https://...",
      "price": 29.00,
      "provider": "freepik",
      "score_overall": 0.8421,
      "score_keyword": 0.80,
      "score_color": 0.90,
      "score_embedding": 0.81,
      "explanation": ["keyword match: logo", "color match: #3B82F6"],
      "clicked": true,
      "click_rank": 1
    }
  ],
  "ai_image_url": "https://..."
}
```

### `POST /api/admin/runs/{run_id}/retry`
Re-queue a failed run as a new job.

**Response `202`:**
```json
{
  "new_job_id": "uuid",
  "run_id": "uuid",
  "message": "Job queued for retry"
}
```

### `GET /api/admin/runs/export`
Export filtered runs as CSV stream.

**Query params:** Same as `GET /api/admin/runs` (no pagination params)
**Response:** `text/csv` stream with `Content-Disposition: attachment; filename=runs-<date>.csv`

---

## 2. Jobs

### `GET /api/admin/jobs`
List jobs with filtering.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string[] | QUEUED\|RUNNING\|SUCCEEDED\|FAILED |
| `error_code` | string | Exact match |
| `date_from` | ISO-8601 | |
| `date_to` | ISO-8601 | |
| `page` | int | |
| `page_size` | int | |

**Response `200`:**
```json
{
  "total": 950,
  "items": [
    {
      "job_id": "uuid",
      "design_id": "uuid",
      "run_id": "uuid",
      "status": "FAILED",
      "progress": 40,
      "duration_ms": 1200,
      "error_code": "PROVIDER_TIMEOUT",
      "created_at": "2026-03-01T12:00:00Z",
      "finished_at": "2026-03-01T12:00:01.2Z",
      "category": "logo",
      "input_mode": "text"
    }
  ]
}
```

### `GET /api/admin/jobs/{job_id}`
Get job detail with step timeline.

**Response `200`:** Full job object including `steps[]`

### `GET /api/admin/jobs/kpi`
Aggregate KPIs for job observability dashboard.

**Response `200`:**
```json
{
  "total_jobs": 1000,
  "succeeded": 850,
  "failed": 100,
  "running": 5,
  "queued": 45,
  "avg_duration_ms": 3240,
  "p50_duration_ms": 2900,
  "p95_duration_ms": 5800,
  "p99_duration_ms": 8200,
  "fail_rate": 0.10,
  "error_code_distribution": {
    "PROVIDER_TIMEOUT": 45,
    "AI_QUOTA_EXCEEDED": 20,
    "PROFILE_PARSE_FAIL": 15,
    "NO_RESULTS": 12,
    "WORKER_CRASH": 8
  }
}
```

---

## 3. Ranking

### `GET /api/admin/ranking/results`
List search results with score breakdowns.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `run_id` | string | Filter by run |
| `provider` | string[] | Filter by provider |
| `min_score` | float | Minimum score_overall |
| `clicked_only` | bool | Only clicked results |
| `page` | int | |
| `page_size` | int | max 500 |

**Response `200`:**
```json
{
  "total": 8420,
  "items": [
    {
      "result_id": "uuid",
      "run_id": "uuid",
      "rank": 1,
      "title": "Premium Logo Bundle",
      "provider": "freepik",
      "score_overall": 0.8421,
      "score_keyword": 0.80,
      "score_color": 0.90,
      "score_embedding": 0.81,
      "price": 29.00,
      "clicked": true,
      "explanation": ["keyword match: logo"]
    }
  ]
}
```

---

## 4. Config

### `GET /api/admin/config/ranking`
Get current active ranking configuration.

**Response `200`:**
```json
{
  "version": 3,
  "description": "Production ranking v3",
  "weights": {
    "w_keyword": 0.45,
    "w_color": 0.20,
    "w_embedding": 0.30,
    "w_meta": 0.05
  },
  "penalties": {
    "no_image": 0.20,
    "duplicate_url": 0.10,
    "negative_keyword": 0.40
  },
  "dedupe_policy": "url",
  "created_at": "2026-02-15T09:00:00Z",
  "created_by": "admin@fmd.dev"
}
```

### `PUT /api/admin/config/ranking`
Update ranking configuration. Requires `ADMIN` role.

**Body:**
```json
{
  "weights": {
    "w_keyword": 0.40,
    "w_color": 0.30,
    "w_embedding": 0.25,
    "w_meta": 0.05
  },
  "reason": "Experiment 001 rollout: color boost",
  "feature_flag": "ranking_weights_v1"
}
```

**Response `200`:** Updated config object

**Error `422`:** Weight validation error
```json
{
  "detail": "Weights must sum to 1.0 (current: 1.05)"
}
```

### `GET /api/admin/config/providers`
List all providers.

### `PATCH /api/admin/config/providers/{provider_id}`
Toggle provider enabled status.

**Body:** `{ "enabled": false }`

### `GET /api/admin/config/changes`
Audit log of all config changes (paginated).

**Response `200`:**
```json
{
  "total": 12,
  "items": [
    {
      "change_id": "uuid",
      "changed_at": "2026-02-28T14:22:00Z",
      "changed_by": "analyst@fmd.dev",
      "config_key": "w_color",
      "old_value": 0.20,
      "new_value": 0.30,
      "reason": "Experiment 001",
      "feature_flag": "ranking_weights_v1"
    }
  ]
}
```

---

## 5. Feature Flags

### `GET /api/admin/flags`
List all feature flags.

### `PATCH /api/admin/flags/{key}`
Update a feature flag.

**Body:**
```json
{
  "enabled": true,
  "variant_pct": 30
}
```

---

## 6. Analytics / KPI

### `GET /api/admin/analytics/kpi`
Aggregate KPI stats for the dashboard.

**Query Parameters:** `date_from`, `date_to`, `category[]`, `input_mode[]`

**Response `200`:**
```json
{
  "total_runs": 1247,
  "success_rate": 0.857,
  "fail_rate": 0.101,
  "avg_duration_ms": 3240,
  "p95_duration_ms": 5800,
  "ctr_at_10": 0.226,
  "zero_result_rate": 0.068,
  "avg_results_count": 9.4
}
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "detail": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "request_id": "uuid"
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Validation error |
| 401 | Missing/invalid auth token |
| 403 | Insufficient role (e.g., VIEWER trying to write) |
| 404 | Resource not found |
| 422 | Business logic validation error |
| 500 | Internal server error |
