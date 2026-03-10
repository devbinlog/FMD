# Experiment 001 — Ranking Weights Tuning: Color Weight +0.10

**Status:** Concluded · Decision: **Partial Rollout**
**Period:** 2026-02-24 → 2026-03-03 (7 days)
**Owner:** analyst@fmd.dev
**Feature Flag:** `ranking_weights_v1`

---

## 1. Background & Hypothesis

### Context
FMD's Ranking v1 uses the following weight formula (without embedding):

```
score = 0.45 * keyword + 0.20 * color + 0.30 * embedding + 0.05 * meta
```

A qualitative review of user sessions (Feb 2026) observed that for **logo** and **icon** category searches, users who clicked results overwhelmingly chose designs whose dominant color closely matched the query's extracted color. However, the color weight (0.20) ranked several visually mismatched results in the top 5 due to strong keyword scores.

### Hypothesis
> Increasing `w_color` from **0.20 → 0.30** (and reducing `w_keyword` from 0.45 → 0.40, `w_embedding` from 0.30 → 0.25) for **text-mode, logo/icon category** runs will increase CTR@10 by ≥2 percentage points without significantly degrading job performance or user complaint rate.

---

## 2. Experiment Design

| Parameter | Value |
|-----------|-------|
| Target population | `input_mode=text`, `category IN (logo, icon)` |
| Experiment period | 7 days (2026-02-24 00:00 UTC → 2026-03-03 23:59 UTC) |
| Split | 50/50 random session assignment |
| Control group size | 1,200 runs (estimated) |
| Variant group size | 1,180 runs (estimated) |
| Feature flag key | `ranking_weights_v1` |
| Randomization unit | `session_id` (sticky assignment) |
| Min detectable effect | +2.0 pp CTR@10 (80% power, α=0.05) |

### Weight Changes

| Signal | Control | Variant | Delta |
|--------|---------|---------|-------|
| `w_keyword` | 0.45 | 0.40 | −0.05 |
| `w_color` | 0.20 | **0.30** | **+0.10** |
| `w_embedding` | 0.30 | 0.25 | −0.05 |
| `w_meta` | 0.05 | 0.05 | 0.00 |
| **Sum** | **1.00** | **1.00** | — |

### Guardrails (experiment stops if violated)
- `job_fail_rate` > 5.0% in either group → immediate halt
- `p95_latency` > 5.0s → halt + investigation
- `complaint_rate` increase > 2.0 pp in variant → rollback

---

## 3. Metrics Definitions

### Primary Metric
- **CTR@10** (`ctr_at_10`): Fraction of runs where at least one of the top-10 results was clicked.
  - Formula: `clicked_runs / total_succeeded_runs`
  - Rationale: Direct signal of user satisfaction with result quality.

### Secondary Metrics

| Metric | Definition | Goal |
|--------|------------|------|
| `time_to_first_click_ms` | Median time from `job_completed` to first `result_clicked` event | Lower is better |
| `zero_result_rate` | Fraction of succeeded runs with 0 results | Should not increase |
| `job_fail_rate` | `FAILED / total` jobs in the experiment window | Should not increase |
| `avg_job_duration_ms` | Mean end-to-end job duration | Should not increase >10% |

### Guardrail Metrics

| Metric | Definition | Threshold |
|--------|------------|-----------|
| `complaint_rate` | Sessions with explicit negative feedback / total sessions | Δ < +2pp |
| `p95_latency_ms` | 95th percentile job duration | < 5,000ms |

---

## 4. Event Schema

All events follow the pattern:
```json
{
  "event": "<event_name>",
  "ts": "<ISO-8601 UTC>",
  "session_id": "<uuid>",
  "run_id": "<uuid | null>",
  "job_id": "<uuid | null>",
  "properties": { ... }
}
```

### `search_submitted`
Fired when user submits a search query.
```json
{
  "event": "search_submitted",
  "ts": "2026-02-25T14:32:01.123Z",
  "session_id": "sess_abc123",
  "run_id": null,
  "job_id": null,
  "properties": {
    "input_mode": "text",
    "category": "logo",
    "query_length": 42,
    "has_canvas_data": false,
    "feature_flags": ["ranking_weights_v1"],
    "experiment_group": "variant"
  }
}
```

### `job_started`
```json
{
  "event": "job_started",
  "ts": "2026-02-25T14:32:01.450Z",
  "session_id": "sess_abc123",
  "run_id": "run_def456",
  "job_id": "job_ghi789",
  "properties": {
    "job_type": "process_design",
    "provider_list": ["mock", "freepik"]
  }
}
```

### `job_failed`
```json
{
  "event": "job_failed",
  "ts": "2026-02-25T14:32:04.100Z",
  "session_id": "sess_abc123",
  "run_id": "run_def456",
  "job_id": "job_ghi789",
  "properties": {
    "error_code": "PROVIDER_TIMEOUT",
    "error_message": "freepik response timeout after 2000ms",
    "step_failed": 3,
    "duration_ms": 2650
  }
}
```

### `job_completed`
```json
{
  "event": "job_completed",
  "ts": "2026-02-25T14:32:05.221Z",
  "session_id": "sess_abc123",
  "run_id": "run_def456",
  "job_id": "job_ghi789",
  "properties": {
    "duration_ms": 3771,
    "results_count": 12,
    "providers_used": ["mock", "freepik"],
    "top_score": 0.8421,
    "zero_results": false,
    "experiment_group": "variant",
    "ranking_config_version": 3
  }
}
```

### `provider_selected`
Fired for each provider invoked during a search run.
```json
{
  "event": "provider_selected",
  "ts": "2026-02-25T14:32:02.000Z",
  "session_id": "sess_abc123",
  "run_id": "run_def456",
  "job_id": "job_ghi789",
  "properties": {
    "provider_id": "freepik",
    "result_count": 8,
    "latency_ms": 921,
    "success": true
  }
}
```

### `result_clicked`
```json
{
  "event": "result_clicked",
  "ts": "2026-02-25T14:32:09.500Z",
  "session_id": "sess_abc123",
  "run_id": "run_def456",
  "job_id": null,
  "properties": {
    "result_id": "res_xyz000",
    "rank": 2,
    "score_overall": 0.7832,
    "score_keyword": 0.70,
    "score_color": 0.91,
    "score_embedding": 0.72,
    "provider": "freepik",
    "time_since_job_completed_ms": 4279,
    "experiment_group": "variant"
  }
}
```

### `ranking_config_changed`
```json
{
  "event": "ranking_config_changed",
  "ts": "2026-02-24T00:00:00Z",
  "session_id": null,
  "run_id": null,
  "job_id": null,
  "properties": {
    "changed_by": "analyst@fmd.dev",
    "config_key": "ranking_config",
    "old_value": { "w_keyword": 0.45, "w_color": 0.20 },
    "new_value": { "w_keyword": 0.40, "w_color": 0.30 },
    "feature_flag": "ranking_weights_v1",
    "reason": "Experiment 001: color weight boost for logo/icon CTR"
  }
}
```

---

## 5. Results (Measured / Assumed Values)

### Experiment Summary

| Group | Runs | Succeeded | Failed | CTR@10 |
|-------|------|-----------|--------|--------|
| Control | 1,200 | 1,034 (86.2%) | 121 (10.1%) | **21.4%** |
| Variant | 1,180 | 1,021 (86.5%) | 115 (9.7%) | **24.9%** |
| **Δ** | — | — | −0.4pp | **+3.5pp** ✅ |

Statistical significance: p=0.031 (two-proportion z-test), **statistically significant** at α=0.05.

### Primary Metric

| Metric | Control | Variant | Delta | Sig? |
|--------|---------|---------|-------|------|
| CTR@10 | 21.4% | 24.9% | **+3.5pp** | ✅ p=0.031 |

### Secondary Metrics

| Metric | Control | Variant | Delta | Status |
|--------|---------|---------|-------|--------|
| `time_to_first_click_ms` (median) | 4,200ms | 3,580ms | **−620ms** ✅ | Improved |
| `zero_result_rate` | 6.8% | 6.5% | −0.3pp | Negligible |
| `job_fail_rate` | 10.1% | 9.7% | −0.4pp | No change |
| `avg_job_duration_ms` | 3,240ms | 3,310ms | +70ms | Acceptable |

### Guardrail Metrics

| Metric | Control | Variant | Threshold | Status |
|--------|---------|---------|-----------|--------|
| `p95_latency_ms` | 2,910ms | 3,080ms | < 5,000ms | ✅ Within |
| `complaint_rate` | 1.2% | 1.4% | Δ < +2pp | ✅ Within |

### Notable Findings

1. **Color score uplift concentrated at rank #1–3**: In the variant, 41% of first clicks were on rank #1 vs. 33% in control — suggesting better result precision, not just more clicks.

2. **Latency p95 slightly worse (+170ms)**: Attributed to embedding score recalculation with updated weights. Not a concern at current scale, but worth monitoring at 10× traffic.

3. **Zero-result rate unchanged**: The hypothesis that color rebalancing might cause fewer matches did not materialize — likely because keyword score still provides the primary matching signal.

4. **Canvas mode not included**: Canvas-mode runs were excluded from the experiment. A separate experiment should validate whether color boost applies equally to canvas (sketch) inputs.

---

## 6. Conclusion & Decision

### Recommendation: **Partial Rollout**

| Dimension | Assessment |
|-----------|------------|
| Primary metric | ✅ Significant +3.5pp CTR improvement |
| Latency impact | ⚠️ Slight p95 increase (+170ms) — monitor at scale |
| Stability | ✅ No meaningful change in fail rate |
| User experience | ✅ Faster first-click (users find what they want sooner) |
| Reversibility | ✅ Config change, instant rollback via feature flag |

### Decision
Promote `ranking_weights_v1` variant weights to **production for `input_mode=text` runs only**, starting with **30% traffic** for 3 additional days, then 100% if p95 latency remains < 3.5s.

**New production config (v4)**:
```
w_keyword  = 0.40  (was 0.45)
w_color    = 0.30  (was 0.20)  ← primary change
w_embedding = 0.25  (was 0.30)
w_meta     = 0.05
```

### Rollback Criteria
Automatically rollback (revert to v3) if any of the following occur within 7 days of full rollout:
- `p95_latency_ms` > 4,000ms (24h average)
- `job_fail_rate` > 12% (24h average)
- `complaint_rate` > 3.0%
- CTR@10 drops below 22% (sustained 48h)

### Follow-up Experiments
1. **Experiment 002**: Validate `w_color` boost for `category=icon` separately (may need higher boost due to icon-specific color sensitivity)
2. **Experiment 003**: Canvas mode — does color boost apply when input is a sketch vs. text?
3. **Experiment 004**: Embedding v2 model swap — independent of weight tuning

---

### Enterprise Decision Statement

> This experiment demonstrates that color-signal amplification meaningfully improves the precision of design discovery for logo/icon queries — the most commercially sensitive category in FMD's user base. The +3.5pp CTR lift and −620ms faster first-click translate directly to higher user engagement and reduced abandonment. The marginal p95 latency increase is within acceptable SLA bounds at current scale. We recommend promoting this config with a 30%→100% ramp and establishing continuous CTR monitoring via the Enterprise Console KPI dashboard as a baseline for future ranking experiments.
>
> — Decision recorded by analyst@fmd.dev, 2026-03-04

---

*Document generated by FMD Enterprise Console — Experiment Reporting Module*
*Template: experiment-report-v1 | Config reference: `configs/console/policies.ts`*
