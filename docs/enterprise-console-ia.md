# Enterprise Console — Information Architecture

**Project:** FMD (Find My Design)
**Document type:** Information Architecture Specification
**Audience:** Operators, Engineers, Product Managers
**Status:** Draft v1.0
**Date:** 2026-03-05

---

## Table of Contents

1. [Purpose & Users](#1-purpose--users)
2. [Global Navigation Structure](#2-global-navigation-structure)
3. [Site Map (Page Tree)](#3-site-map-page-tree)
4. [Page Breakdown](#4-page-breakdown)
5. [Core User Flows](#5-core-user-flows)
6. [Role-Based Access Control Matrix](#6-role-based-access-control-matrix)

---

## 1. Purpose & Users

### 1.1 Purpose

The FMD Enterprise Console is a **PC-only** (minimum viewport: 1280 × 800 px) internal operations and management interface. It gives operators, engineers, and product managers a single pane of glass to monitor AI-powered design search activity, diagnose failures, tune ranking quality, manage provider integrations, and control system configuration — all without requiring direct database or API access.

The console is intentionally decoupled from the user-facing frontend (`/`). It lives under the `/admin` path prefix, requires authenticated sessions with role claims, and is never exposed to end-users.

### 1.2 User Roles

| Role | Persona | Primary Goals | Typical Session Length |
|------|---------|---------------|----------------------|
| **Operator** | On-call SRE / support engineer responding to incidents | Detect and resolve active failures; retry stuck jobs; disable degraded providers; check system health | 5–20 min (incident-driven) |
| **Engineer** | Backend / ML engineer tuning the ranking pipeline or integrating new providers | Inspect job step timelines; adjust ranking weights; A/B test config changes; read raw score breakdowns | 30–90 min (iterative) |
| **PM / Analyst** | Product manager or data analyst measuring search quality and usage trends | Track KPIs (success rate, latency, results count); compare provider mix over time; read ranking explanations; export data | 15–60 min (exploratory) |

### 1.3 Non-Goals

- Mobile / tablet layout (PC-only by design)
- Direct SQL query execution (handled by separate internal tooling)
- User account management for end-users (out of scope for this console)
- Real-time video or audio content

---

## 2. Global Navigation Structure

The console uses a **fixed left sidebar** (240 px wide, collapsible to 56 px icon-only mode) with top-level navigation items. A persistent top bar carries the logged-in user's role badge, a global search field (searches run IDs and job IDs), and a notifications bell.

### 2.1 Sidebar Navigation Items

| Order | Icon | Label | Path | Description |
|-------|------|-------|------|-------------|
| 1 | `LayoutDashboard` | Overview | `/admin` | System health summary, live KPI cards, recent activity feed |
| 2 | `Search` | Search Runs | `/admin/runs` | Full history of SearchRun records; filter, inspect, and re-trigger |
| 3 | `Cpu` | Jobs | `/admin/jobs` | Real-time job queue and step-level execution detail |
| 4 | `BarChart2` | Ranking | `/admin/ranking` | Score distributions, weight editor, config versioning |
| 5 | `Settings` | Config Studio | `/admin/config` | Provider management, feature flags, ranking policy |
| — | `ChevronLeft` | Collapse sidebar | — | Toggle icon-only mode |

### 2.2 Top Bar Elements

```
[ FMD Enterprise Console ]  [ Search: run_id / job_id... ]     [ 🔔 3 ]  [ Engineer · admin ]
```

- **Global Search**: accepts a `run_id` (UUID) or `job_id` (UUID) and navigates directly to the relevant detail drawer.
- **Notification Bell**: surfaces system-level alerts (e.g., provider error rate spike, job queue depth warning).
- **User Menu**: shows role badge, account settings link, and sign-out.

---

## 3. Site Map (Page Tree)

```
/admin                               ← Overview Dashboard (redirect → /admin/runs)
│
├── /admin/runs                      ← Search Runs List
│   └── Drawer: Run Detail           ← slide-over on row click (URL: ?drawer=<run_id>)
│       ├── Tab: Overview            ← metadata, keywords, AI image, score breakdown
│       ├── Tab: Job Timeline        ← step-level Gantt view
│       └── Tab: Results (N)         ← top result list with scores
│
├── /admin/jobs                      ← Job Queue List
│   └── Inline Panel: Job Detail     ← right-side panel on row click
│       └── JobTimeline component    ← step status with timestamps
│
├── /admin/ranking                   ← Ranking Debugger
│   └── CompareDrawer                ← slide-over when 2 results selected
│
└── /admin/config                    ← Config Studio
    ├── Tab: Ranking Weights         ← sliders + validation + save
    ├── Tab: Providers               ← toggle enabled/disabled + health stats
    ├── Tab: Feature Flags           ← toggle + variant_pct control
    └── Tab: Change History          ← append-only audit log
```

### 3.1 URL Convention

| Pattern | Meaning |
|---------|---------|
| `/admin/*` | Requires authenticated session with `ADMIN`, `ANALYST`, or `VIEWER` role |
| `?drawer=<run_id>` | Deep-linkable drawer state; browser back closes drawer |
| `?tab=<tab_key>` | Preserves active tab across page refreshes |
| `?page=N&size=50` | Pagination state in URL for shareability |

---

## 4. Page Breakdown

### 4.1 `/admin/runs` — Search Runs

#### Purpose
Full audit trail of every `SearchRun` record. Supports investigation of individual search outcomes, monitoring of input mode distribution (text vs. canvas), and identification of systematic failure patterns.

#### Domain Entity
```typescript
SearchRun {
  run_id:        string      // UUID
  created_at:    datetime
  input_mode:    "text" | "canvas"
  category:      string      // logo, banner, icon, etc.
  query_summary: string      // truncated prompt / sketch description
  keywords:      string[]
  dominant_color: string     // hex e.g. "#3B82F6"
  job_status:    "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED"
  duration_ms:   number | null
  results_count: number
  provider_mix:  string[]
  error_code:    string | null
  ctr:           number | null   // 1 if any result clicked, else 0
  feature_flags: string[]
}
```

#### Key UI Regions

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP KPI BAR (6 cards)                                          │
│  Total Runs | Success Rate | Fail Rate | Avg Duration | CTR@10  │
│  Zero-Result Rate                                               │
├─────────────────────────────────────────────────────────────────┤
│  FILTERS PANEL (config-driven, from RUNS_FILTERS)               │
│  [Date Range] [Status ▾] [Mode ▾] [Category ▾] [Provider ▾]    │
│  [Error Code ▾] [Query search…] [Duration range]  [Clear all]   │
├─────────────────────────────────────────────────────────────────┤
│  MAIN TABLE  (config-driven from RUNS_COLUMNS)                  │
│  Run ID | Created | Mode | Category | Query | Status |          │
│  Duration | Results | Providers | Error | Color | CTR          │
│  [Column visibility toggle ▾]                                    │
├─────────────────────────────────────────────────────────────────┤
│  PAGINATION  1,000 rows / 50 per page  ← 1 2 3 … 20 →          │
│  [Export CSV (filtered)]                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ row click
           ┌──────────────────────────────────────────┐
           │  RUN DETAIL DRAWER (480 px, right slide)  │
           │  ┌─ Header: run_id, status badge, time   │
           │  ├─ Tab: Overview                        │
           │  │    Metadata grid (mode, category,     │
           │  │    providers, result count)           │
           │  │    Query text preview                 │
           │  │    Keywords chips                     │
           │  │    AI Reference Image                 │
           │  │    Top-result Score Breakdown bars    │
           │  │    Feature flags                      │
           │  ├─ Tab: Job Timeline                    │
           │  │    Step-level timeline with durations │
           │  │    Error block (if FAILED)            │
           │  └─ Tab: Results (N)                     │
           │       Result rows: rank, thumbnail,      │
           │       title, provider, score, clicked    │
           │  [Retry] (visible only when FAILED)      │
           └──────────────────────────────────────────┘
```

#### Key Actions

| Action | Roles | Description |
|--------|-------|-------------|
| Filter & sort | All | Narrow runs by any attribute combination |
| Open Run Detail | All | Slide-over drawer with full metadata and linked job |
| Retry failed run | ADMIN | Submit new job from same design input |
| Export CSV | ADMIN, ANALYST | Download current filtered set as CSV |
| Copy run_id | All | One-click copy for incident tickets |

---

### 4.2 `/admin/jobs` — Job Observability

#### Purpose
Real-time visibility into the asyncio job queue and historical job execution. Engineers diagnose slow/failed jobs at the step level. Operators detect queue depth spikes and manually retry blocked jobs.

#### Job State Machine
```
QUEUED ──→ RUNNING ──→ SUCCEEDED
                  └──→ FAILED
```
Progress milestones: `0% → 40% → 70% → 100%`

Each job has 4 steps:
1. **Profile Generation** (keyword extraction + color analysis)
2. **AI Image Synthesis** (Stable Diffusion / mock)
3. **Provider Search** (parallel provider requests)
4. **Ranking & Dedup** (score calculation + deduplication)

#### Key UI Regions

```
┌──────────────────────────────────────────────────────────────┐
│  KPI CARDS (5 cards)                                         │
│  Total Jobs | Succeeded | Failed | Running | Avg Duration    │
├──────────────────────────────────────────────────────────────┤
│  STATE MACHINE LEGEND                                        │
│  QUEUED → RUNNING → SUCCEEDED | → (on error) → FAILED       │
│  Progress: 0% → 40% → 70% → 100%                            │
├──────────────────────────────────────────────────────────────┤
│  FILTERS (config-driven from JOBS_FILTERS)                   │
│  [Date Range] [Status ▾] [Category ▾] [Error Code ▾]        │
├──────────────────────────────────────────────────────────────┤
│  MAIN TABLE (config-driven from JOBS_COLUMNS)                │
│  Job ID | Started | Status | Progress | Duration |           │
│  Category | Mode | Error | Run                               │
├──────────────────────────────────────────────────────────────┤
│  PAGINATION                                                  │
└──────────────────────────────────────────────────────────────┘
                      ↓ row click
   ┌──────────────────────────────────────┐
   │  INLINE DETAIL PANEL (280 px right)  │
   │  Job ID / Design ID (mono)           │
   │  JobTimeline component               │
   │   ✓ 1. Profile Generation  120ms    │
   │   ✗ 2. AI Image Synthesis  2400ms   │
   │     3. Provider Search  (pending)   │
   │     4. Ranking & Dedup  (pending)   │
   │  Error block (if FAILED)            │
   │  [Retry Job] (when FAILED)          │
   └──────────────────────────────────────┘
```

#### Key Actions

| Action | Roles | Description |
|--------|-------|-------------|
| View step timeline | All | See duration and status of each job step |
| Retry failed job | ADMIN | Re-queue failed job; new attempt tracked |
| Filter by error code | All | Identify systematic failure patterns |

---

### 4.3 `/admin/ranking` — Ranking Debugger

#### Purpose
Enable Engineers and Analysts to inspect score breakdowns, compare results side-by-side, and validate ranking quality after config changes.

#### Score Formula (current v3)
```
score_overall = 0.45 × score_keyword
              + 0.20 × score_color
              + 0.30 × score_embedding
              + 0.05 × score_meta
              × (1 - applicable_penalties)
```

#### Key UI Regions

```
┌──────────────────────────────────────────────────────────────┐
│  ACTIVE WEIGHTS BANNER                                       │
│  ℹ Ranking v3: keyword=0.45, color=0.20, embedding=0.30     │
├──────────────────────────────────────────────────────────────┤
│  COMPARE QUEUE (when 2 rows selected)                        │
│  A: "Premium Logo Bundle…" | B: "Flat Icon Set…"             │
│  [Compare Selected]                                          │
├──────────────────────────────────────────────────────────────┤
│  FILTERS (config-driven from RANKING_FILTERS)                │
│  [Run ID search] [Provider ▾] [Min Score slider] [Clicked ○]│
├──────────────────────────────────────────────────────────────┤
│  MAIN TABLE (config-driven from RANKING_COLUMNS)             │
│  # | Title | Provider | Overall | Keyword | Color |         │
│  Embedding | Price | Clicked                                 │
│  (showing top 200 rows; use filters to narrow)               │
└──────────────────────────────────────────────────────────────┘
               ↓ row click
   ┌────────────────────────────┐
   │  SCORE BREAKDOWN PANEL     │
   │  (280 px right sidebar)    │
   │  Rank # / Title / Provider │
   │  Keyword  ████░░  0.723    │
   │  Color    ██████  0.901    │
   │  Embedding ████░  0.680    │
   │  Overall:       0.7832     │
   │  Why ranked here:          │
   │   ✓ keyword match: logo    │
   │   ✓ color match: #3B82F6  │
   └────────────────────────────┘
```

#### Compare Drawer
When 2 rows are selected and [Compare Selected] is clicked:
- Side-by-side title / rank / provider cards
- Delta bars for each score dimension (Δ shown as +/− with color coding)
- Explanation lists for both results

---

### 4.4 `/admin/config` — Config Studio

#### Purpose
Central configuration hub for ranking weights, provider on/off switches, feature flags, and change history audit.

#### Tabs

| Tab | Key Purpose | Primary User |
|-----|-------------|--------------|
| **Ranking Weights** | Edit w_keyword/w_color/w_embedding/w_meta sliders; save/reset | Engineer |
| **Providers** | Toggle providers on/off; view latency/success stats | Operator, Engineer |
| **Feature Flags** | Toggle experiment flags; adjust variant_pct | Engineer |
| **Change History** | Append-only audit log of all config mutations | All |

#### Ranking Weights UI
```
┌────────────────────────────────────────────────────────────┐
│  Weight Configuration   Version 3   Σ = 1.000 ✓           │
│                                                            │
│  Keyword Score (w_keyword)    ████████░░  0.45  45%       │
│  Color Score (w_color)        ████░░░░░░  0.20  20%       │
│  Embedding Score (w_embedding) ██████░░░░ 0.30  30%       │
│  Meta Score (w_meta)          █░░░░░░░░░  0.05   5%       │
│                                                            │
│  ⚠ Weights must sum to 1.0                                 │
│  [Save Config]  [Reset to Default]                         │
├────────────────────────────────────────────────────────────┤
│  Penalty Configuration                                     │
│  No Image: -20%  │  Duplicate URL: -10%  │  Neg KW: -40%  │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Core User Flows

### Flow 1: Failed Job Root Cause Analysis → Retry

**Actor:** Operator (primary)
**Entry:** Alert or Overview Dashboard red indicator
**Goal:** Identify why jobs are failing en masse and restore service

```
1. Operator opens /admin/jobs
   → Status filter auto-set to FAILED, last 1 hour
   → Sees 47 FAILED rows; most share error_code = "AI_QUOTA_EXCEEDED"

2. Operator clicks the most recent FAILED row
   → Inline Job Detail panel opens (right side)
   → JobTimeline shows:
       ✓ Profile Generation   118ms
       ✗ AI Image Synthesis  30,004ms  ← quota exceeded
         Provider Search     (pending)
         Ranking & Dedup     (pending)

3. Operator navigates to /admin/config → Feature Flags
   → Finds flag: "embedding_v2" (enabled=ON, variant_pct=100)
   → Toggles OFF → system skips AI image generation step
   → New jobs now proceed without AI reference image

4. Operator returns to /admin/jobs
   → Clicks [Retry Job] on 5 sample FAILED jobs
   → Status transitions QUEUED → RUNNING → SUCCEEDED
   → Confirms fix effective; notes job_id links in incident ticket

5. After Stability AI quota resets:
   → Operator re-enables the feature flag
   → Monitors fail rate on /admin/runs KPI bar for 15 min
```

---

### Flow 2: Ranking Anomaly Detection → Weight Experiment → Config Change

**Actor:** Engineer (primary), PM/Analyst (initiates)
**Entry:** PM reports CTR@10 dropped from 23% to 17% over past 7 days
**Goal:** Identify degraded score component, tune weights, restore quality

```
1. PM opens /admin/runs
   → Sets date range: last 14 days
   → Observes: CTR@10 KPI card shows 17.2% (was 23.1%)
   → Exports CSV; sends to Engineer

2. Engineer opens /admin/ranking
   → Filters: date = last 7 days
   → Score Breakdown panel for multiple runs shows:
       score_keyword averaging 0.31 (was ~0.62)
       score_color and score_embedding are stable
   → Hypothesis: keyword extraction degraded for Korean queries

3. Engineer checks /admin/config → Ranking Weights tab
   → Current: keyword=0.45, color=0.20, embedding=0.30, meta=0.05
   → Proposes: keyword=0.35, color=0.30, embedding=0.30, meta=0.05
     (boost color/embedding to compensate while keyword fix is in progress)

4. Engineer adjusts sliders → Σ validates as 1.00
   → Clicks [Save Config] → saved as v4 in Change History
   → Adds reason: "Compensate for keyword extraction regression (KOR)"

5. Engineer monitors /admin/runs for next 2 hours
   → CTR@10 recovers to 20.4% (partial recovery expected)
   → Zero-result rate unchanged (5.8%)

6. PM/Engineer files separate ticket to fix Korean keyword extraction
   → Once fixed, Engineer reverts w_keyword to 0.45 via Config Studio
```

---

### Flow 3: Provider Quality Degradation → Mix Analysis → Provider Off Experiment

**Actor:** Engineer (primary), Operator (secondary)
**Entry:** User complaint tickets: "all results look the same"
**Goal:** Identify and safely disable degraded provider

```
1. Engineer opens /admin/runs
   → Scans "Providers" column: most runs show only ["mock", "freepik"]
   → Expected: ["mock", "freepik", "creative_market"]
   → creative_market absent from provider_mix in 80% of recent runs

2. Engineer clicks a run with ["mock", "freepik"] only
   → Run Detail Drawer → Job Timeline → Provider Search step
   → Step metadata shows:
       mock: 15 results, 0 errors
       freepik: 8 results, 0 errors
       creative_market: 0 results, 7 errors (HTTP 429 Rate Limited)

3. Engineer opens /admin/config → Providers tab
   → creative_market row shows: success_rate=12%, avg_latency=4800ms
   → Health badge: RED

4. Engineer toggles creative_market → OFF
   → New runs use only mock + freepik
   → Monitors results_count average: 20 (unchanged; mock compensates)

5. Engineer creates GitHub issue: "creative_market: implement exponential
   backoff + rotating UA headers"
   → After fix deployed: re-enables provider in Config Studio
   → Watches success_rate recover to 88%+ over 1 hour

6. Operator documents in incident timeline using run_id deep links:
   /admin/runs?drawer=<run_id> shared in Slack thread
```

---

## 6. Role-Based Access Control Matrix

### 6.1 Role Definitions

| Role ID | Display Name | Description |
|---------|-------------|-------------|
| `ADMIN` | Engineer | Full read/write access to all console features |
| `ANALYST` | PM / Analyst | Read everywhere; export; no config mutations |
| `VIEWER` | Observer | Read-only on runs and jobs; no config access |

### 6.2 Page Access Matrix

| Page / Feature | ADMIN | ANALYST | VIEWER |
|----------------|-------|---------|--------|
| `/admin/runs` — View list & filters | Read | Read | Read |
| `/admin/runs` — Open Run Detail drawer | Read | Read | Read |
| `/admin/runs` — Retry failed run | **Write** | — | — |
| `/admin/runs` — Export CSV | **Write** | **Write** | — |
| `/admin/jobs` — View list & filters | Read | Read | Read |
| `/admin/jobs` — Open Job Detail + Timeline | Read | Read | Read |
| `/admin/jobs` — Retry Job | **Write** | — | — |
| `/admin/ranking` — View score table | Read | Read | — |
| `/admin/ranking` — Score breakdown panel | Read | Read | — |
| `/admin/ranking` — Compare drawer | Read | Read | — |
| `/admin/ranking` — Export CSV | **Write** | **Write** | — |
| `/admin/config` — Ranking Weights (view) | Read | Read | — |
| `/admin/config` — Edit & Save weights | **Write** | — | — |
| `/admin/config` — Provider toggle | **Write** | — | — |
| `/admin/config` — Feature Flag toggle | **Write** | — | — |
| `/admin/config` — Feature Flag variant_pct | **Write** | **Write** | — |
| `/admin/config` — Change History (view) | Read | Read | — |

### 6.3 Authorization Notes

- Role claims are embedded in JWT payload: `{ "role": "ADMIN" | "ANALYST" | "VIEWER" }`
- All mutation endpoints enforce server-side role checks (frontend gate is supplementary)
- Config mutations write to an append-only audit log: `actor_id`, `role`, `timestamp`, `diff`
- JWT expiry: 15 min (sliding refresh up to 8 h)

---

*Document maintained by the FMD engineering team.*
*Template: enterprise-ia-v1 | Config reference: `configs/console/`*
