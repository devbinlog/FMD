# Enterprise Console — Component Tree & Technical Design

**Project:** FMD (Find My Design)
**Document type:** Frontend Technical Design
**Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Lucide React
**Status:** Draft v1.0
**Date:** 2026-03-05

---

## Table of Contents

1. [Component Tree (per route)](#1-component-tree-per-route)
2. [State Management Strategy](#2-state-management-strategy)
3. [Data Fetching Strategy](#3-data-fetching-strategy)
4. [Role-Based Access Control](#4-role-based-access-control)
5. [Configuration-Driven Rendering Design](#5-configuration-driven-rendering-design)
6. [Error Handling Strategy](#6-error-handling-strategy)
7. [Performance Optimization](#7-performance-optimization)

---

## 1. Component Tree (per route)

### Shared Shell

```
app/admin/layout.tsx
└── AdminLayout (div.flex.min-h-screen)
    ├── AdminNav (sidebar, w-56, sticky)
    │   ├── Logo + Brand (FMD / Enterprise Console)
    │   ├── NavItem × 4 (Search Runs / Jobs / Ranking / Config)
    │   └── Footer (version badge)
    └── <main> (flex-1, overflow-auto)
        └── {children}           ← page slot
```

---

### `/admin/runs` — Search Runs

```
RunsPage (Client Component)
├── PageHeader
│   ├── Title + Description
│   └── ExportCSVButton (onClick → exportCSV(filtered))
├── KPIBar
│   └── KPICard × 6
│       (Total Runs, Success Rate, Fail Rate,
│        Avg Duration, CTR@10, Zero-Result Rate)
├── FiltersPanel  ← config-driven, reads RUNS_FILTERS
│   ├── FilterLabel + active count badge
│   ├── DateRangePicker (key: dateRange)
│   ├── MultiSelect (key: job_status)
│   ├── MultiSelect (key: input_mode)
│   ├── MultiSelect (key: category)
│   ├── MultiSelect (key: provider)
│   ├── SingleSelect (key: error_code)
│   ├── TextFilter (key: query)
│   └── ClearAllButton (visible when activeCount > 0)
├── DataTable  ← config-driven, reads RUNS_COLUMNS
│   ├── ColumnToggle (column visibility control)
│   ├── <thead>
│   │   └── <th> × N  (sortable headers with ChevronUp/Down)
│   └── <tbody>
│       ├── LoadingSkeleton × 8 (when loading=true)
│       ├── EmptyRow (when no results)
│       └── DataRow × N
│           └── CellValue (renders per col.type: badge|date|score|tags|…)
├── Pagination
│   ├── PageInfo (X–Y of Z)
│   ├── PageSizeSelect
│   └── PageButtons (prev / numbers / next)
└── RunDetailDrawer (portal, when selectedRun !== null)
    ├── Backdrop (onClick → close)
    └── DrawerPanel (w-480, flex-col)
        ├── DrawerHeader (run_id, status, [Retry] button, [✕])
        ├── StatusBadge row (status, created_at, duration)
        ├── TabBar (Overview | Job Timeline | Results N)
        └── TabContent
            ├── OverviewTab
            │   ├── MetadataGrid (mode, category, results, providers)
            │   ├── QueryPreview (text block)
            │   ├── KeywordChips
            │   ├── AIReferenceImage (lazy load)
            │   ├── ScoreBreakdownBars × 3 (keyword/color/embedding)
            │   └── FeatureFlagChips
            ├── TimelineTab
            │   └── JobTimeline
            │       ├── TimelineHeader (label + total duration)
            │       ├── StepRow × 4 (icon + label + duration + detail)
            │       └── ErrorBlock (when error_code present)
            └── ResultsTab
                └── ResultRow × N
                    (rank, thumbnail, title, provider, score, ExternalLink)
```

---

### `/admin/jobs` — Job Observability

```
JobsPage (Client Component)
├── PageHeader
├── JobKPICards × 5
│   (Total, Succeeded, Failed, Running, Avg Duration)
├── StateMachineLegend
│   └── StateChip × 4 + arrows (QUEUED→RUNNING→SUCCEEDED|FAILED)
├── FiltersPanel  ← reads JOBS_FILTERS
│   ├── DateRangePicker
│   ├── MultiSelect (status)
│   ├── MultiSelect (category)
│   └── SingleSelect (error_code)
├── flex container
│   ├── DataTable  ← reads JOBS_COLUMNS
│   │   (job_id, started, status, progress, duration,
│   │    category, mode, error, run_id)
│   └── InlineDetailPanel (w-80, sticky, when selectedJob !== null)
│       ├── PanelHeader (Job Detail + [✕])
│       ├── IDSection (job_id, design_id monospace)
│       ├── JobTimeline (reused from components/admin/)
│       └── RetryButton (when status === 'FAILED')
└── RetryLog (bg-gray-50, when retryLog.length > 0)
    └── LogLine × N (timestamp + job_id snippet)
```

---

### `/admin/ranking` — Ranking Debugger

```
RankingPage (Client Component)
├── PageHeader
├── CompareCTAButton (when compareA && compareB)
├── ActiveWeightsBanner (ℹ info box with current w_*)
├── CompareQueue (when compareA or compareB selected)
│   ├── CompareBadge A (title preview + [✕])
│   ├── CompareBadge B (title preview + [✕])
│   └── HintText ("Click another row to select B")
├── FiltersPanel  ← reads RANKING_FILTERS
│   ├── TextFilter (run_id)
│   ├── MultiSelect (provider)
│   ├── RangeSlider (min_score)
│   └── ToggleFilter (clicked_only)
├── flex container
│   ├── DataTable  ← reads RANKING_COLUMNS
│   │   (rank, title, provider, overall, keyword,
│   │    color, embedding, price, clicked)
│   └── ScoreBreakdownPanel (w-72, sticky, when selectedResult)
│       ├── PanelHeader (BarChart2 icon + [✕])
│       ├── ResultMeta (rank, title, provider)
│       ├── ScoreBreakdown
│       │   └── ScoreBar × 3 (label + bar + value + contribution)
│       │   └── OverallScoreRow
│       └── ExplanationList
│           └── ExplanationItem × N (✓ icon + text)
└── CompareDrawer (portal, when showCompare)
    ├── Backdrop
    └── ComparePanel (w-540)
        ├── DrawerHeader (ArrowLeftRight icon)
        ├── ResultCards × 2 (rank, title, provider, clicked badge)
        ├── ScoreComparisonSection
        │   └── DeltaBar × 4 (overall, keyword, color, embedding)
        │       (two bars side-by-side with Δ label)
        └── ExplanationColumns × 2
```

---

### `/admin/config` — Config Studio

```
ConfigPage (Client Component)
├── PageHeader
├── TabBar (Ranking Weights | Providers | Feature Flags | Change History)
└── TabContent
    ├── WeightsTab (when activeTab === 'weights')
    │   ├── WeightConfigCard
    │   │   ├── CardHeader (version, description, WeightSumBadge)
    │   │   ├── WeightSlider × 4
    │   │   │   (w_keyword, w_color, w_embedding, w_meta)
    │   │   │   └── [label] [number input] [% display]
    │   │   │       [range slider]
    │   │   ├── ValidationError (AlertTriangle + message)
    │   │   └── ActionRow
    │   │       ├── SaveConfigButton (loading state with spinner)
    │   │       └── ResetButton
    │   └── PenaltyConfigCard
    │       └── PenaltyStatGrid × 3
    │           (No Image / Duplicate URL / Negative Keyword)
    ├── ProvidersTab (when activeTab === 'providers')
    │   └── ProviderListCard
    │       └── ProviderRow × N
    │           ├── ProviderMeta (name, base_url)
    │           ├── StatsRow (latency, success rate, avg results)
    │           └── ToggleSwitch (enabled/disabled)
    ├── FlagsTab (when activeTab === 'flags')
    │   └── FlagListCard
    │       └── FlagRow × N
    │           ├── FlagMeta (key, description, owner, variant_pct, expires)
    │           ├── ExpiredBadge (when past expires_at)
    │           └── ToggleSwitch
    └── HistoryTab (when activeTab === 'history')
        └── HistoryListCard
            └── ChangeRow × N
                ├── TimelineDot
                ├── ChangeHeader (config_key, timestamp)
                ├── ChangedBy (email)
                ├── Reason (text)
                ├── DiffRow (old_value → new_value, mono, colored)
                └── FeatureFlagChip (when feature_flag present)
```

---

## 2. State Management Strategy

### 2.1 Three-Layer State Model

```
┌─────────────────────────────────────────────┐
│  Server State (TanStack Query — planned)     │
│  Handles: fetching, caching, polling,        │
│  optimistic updates, background refetch      │
├─────────────────────────────────────────────┤
│  Global Client State (Zustand — planned)     │
│  Handles: active filters, drawer open state, │
│  column visibility, compare queue            │
├─────────────────────────────────────────────┤
│  Local UI State (React useState)             │
│  Handles: tab selection, save status,        │
│  retry log, toast messages                   │
└─────────────────────────────────────────────┘
```

**Current Implementation:** The MVP uses `useState` + in-memory mock data (no server calls). The structure is designed for easy migration to TanStack Query.

### 2.2 Planned TanStack Query Hooks

```typescript
// Runs
function useRunsQuery(filters: FilterValues, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['runs', filters, page, pageSize],
    queryFn: () => fetchRuns(filters, page, pageSize),
    placeholderData: keepPreviousData,   // no flash on page change
    staleTime: 30_000,
  });
}

function useRunDetailQuery(runId: string | null) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn: () => fetchRunDetail(runId!),
    enabled: runId !== null,             // only fetch when drawer opens
  });
}

// Jobs
function useJobsQuery(filters: FilterValues, page: number) {
  return useQuery({
    queryKey: ['jobs', filters, page],
    queryFn: () => fetchJobs(filters, page),
    refetchInterval: (data) =>
      data?.items.some(j => j.status === 'RUNNING') ? 5_000 : false,
  });
}

function useRetryJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => retryJob(jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

// Config
function useRankingConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: RankingPolicyConfig) => saveRankingConfig(config),
    onMutate: async (newConfig) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['ranking-config'] });
      const prev = queryClient.getQueryData(['ranking-config']);
      queryClient.setQueryData(['ranking-config'], newConfig);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback on error
      queryClient.setQueryData(['ranking-config'], ctx?.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ranking-config'] }),
  });
}
```

### 2.3 Planned Zustand Slices

```typescript
// stores/consoleStore.ts

interface FiltersSlice {
  runsFilters: FilterValues;
  jobsFilters: FilterValues;
  rankingFilters: FilterValues;
  setFilter: (page: 'runs' | 'jobs' | 'ranking', key: string, value: unknown) => void;
  resetFilters: (page: 'runs' | 'jobs' | 'ranking') => void;
}

interface DrawerSlice {
  selectedRunId: string | null;
  selectedJobId: string | null;
  openRunDrawer: (id: string) => void;
  closeDrawer: () => void;
}

interface CompareSlice {
  compareA: RankingRow | null;
  compareB: RankingRow | null;
  showCompare: boolean;
  setCompareA: (r: RankingRow | null) => void;
  setCompareB: (r: RankingRow | null) => void;
  openCompare: () => void;
  closeCompare: () => void;
}
```

### 2.4 URL State (Deep-linkable)

```typescript
// Filters and pagination are reflected in URL search params
// so console pages can be bookmarked and shared

// /admin/runs?status=FAILED&date_from=2026-03-01&page=2
// /admin/runs?drawer=abc12345-...  (opens specific run drawer)
// /admin/config?tab=providers
```

---

## 3. Data Fetching Strategy

### 3.1 List Pages (Runs / Jobs)

| Aspect | Implementation |
|--------|---------------|
| Pagination | URL-driven `?page=N&size=50`; TanStack Query `keepPreviousData` prevents flicker |
| Sorting | Client-side for mock data; server-side `?sort_by=created_at&sort_dir=desc` for real API |
| Filtering | Client-side filter function in MVP; server-side query params for production |
| Cache TTL | 30s stale time; invalidated on mutations |
| Background refetch | Every 5s when any `RUNNING` job exists (polling via `refetchInterval`) |

### 3.2 Detail Fetching (Drawers)

```typescript
// Run detail: lazy-fetched only when drawer opens
useQuery({ queryKey: ['run', runId], enabled: !!runId })

// Job detail: same pattern
useQuery({ queryKey: ['job', jobId], enabled: !!jobId })
```

### 3.3 Config (Optimistic Updates)

```typescript
// Config saves use optimistic updates to feel instant
// Rollback automatically on API error
useMutation({ onMutate: optimisticUpdate, onError: rollback })
```

### 3.4 Mock Adapter (Current MVP)

```typescript
// frontend/src/lib/mock/generators.ts
// generateSearchRuns(1000) — runs once, result cached in module scope
// No network calls; all filtering/sorting is pure client-side

const ALL_RUNS = generateSearchRuns(1000);  // module-level singleton
```

---

## 4. Role-Based Access Control

### 4.1 Role Gate Component

```typescript
// components/admin/Can.tsx
interface CanProps {
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  action: 'read' | 'write';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ role, action, children, fallback = null }: CanProps) {
  const { userRole } = useAuth();
  const allowed = checkPermission(userRole, role, action);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

// Usage:
// <Can role="ADMIN" action="write">
//   <RetryButton />
// </Can>
```

### 4.2 Server-Side Guard (page.tsx)

```typescript
// Middleware pattern (next.js middleware.ts)
export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token');
  if (!token && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### 4.3 Role × Component Matrix

| Component | ADMIN | ANALYST | VIEWER |
|-----------|-------|---------|--------|
| `DataTable` (view) | ✓ | ✓ | ✓ |
| `FiltersPanel` (interact) | ✓ | ✓ | ✓ |
| `RunDetailDrawer` (open) | ✓ | ✓ | ✓ |
| `RetryButton` (runs/jobs) | ✓ | — | — |
| `ExportCSVButton` | ✓ | ✓ | — |
| `ScoreBreakdownPanel` | ✓ | ✓ | — |
| `CompareDrawer` | ✓ | ✓ | — |
| `WeightSlider` (edit) | ✓ | — | — |
| `SaveConfigButton` | ✓ | — | — |
| `ProviderRow > ToggleSwitch` | ✓ | — | — |
| `FlagRow > ToggleSwitch` | ✓ | — | — |
| `FlagRow > variant_pct edit` | ✓ | ✓ | — |
| `ChangeHistory` (view) | ✓ | ✓ | — |

---

## 5. Configuration-Driven Rendering Design

The core architectural pattern of the Enterprise Console is that **adding or modifying a column, filter, or policy requires only editing a config file** — no component code changes needed.

### 5.1 TypeScript Interfaces

```typescript
// configs/console/columns.ts

export interface ColumnDef<T = Record<string, unknown>> {
  key: keyof T | string;        // maps to data field
  label: string;                // column header text
  type: ColumnType;             // controls cell renderer
  width?: number;               // px
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  hideable?: boolean;
  defaultVisible?: boolean;
  format?: (value: unknown, row: T) => string | null;
  badgeVariant?: (value: unknown) => 'success' | 'error' | 'warning' | 'info' | 'neutral';
  tooltip?: string;
}

export type ColumnType =
  | 'text'         // plain truncated string
  | 'date'         // ISO string → "Mar 1 14:32"
  | 'badge'        // colored pill (uses badgeVariant)
  | 'number'       // tabular-nums
  | 'duration'     // ms → "1.2s" or "450ms"
  | 'score'        // float + mini progress bar
  | 'tags'         // string[] → chips (max 3 + overflow)
  | 'color_dot'    // hex → colored circle
  | 'link'         // text with external link icon
  | 'actions';     // reserved for action buttons
```

```typescript
// configs/console/filters.ts

export interface FilterDef {
  key: string;
  label: string;
  type: 'daterange' | 'multiselect' | 'select' | 'text' | 'range' | 'toggle';
  placeholder?: string;
  options?: FilterOption[];
  min?: number;
  max?: number;
  width?: number;
  clearable?: boolean;
  defaultValue?: unknown;
  tooltip?: string;
}
```

```typescript
// configs/console/policies.ts

export interface RankingPolicyConfig {
  version: number;
  description: string;
  weights: {
    w_keyword: number;    // all must sum to 1.0
    w_color: number;
    w_embedding: number;
    w_meta: number;
  };
  penalties: {
    no_image: number;          // 0–1 multiplier deduction
    duplicate_url: number;
    negative_keyword: number;
  };
  dedupe: { strategy: 'url' | 'title_similarity' | 'none' };
  providers: ProviderPolicy[];
}
```

### 5.2 Config Example: Adding a New Column

**Requirement:** Add "First Click Rank" column to the Runs table.

**Step 1 — Edit `configs/console/columns.ts`:**
```typescript
// Add ONE entry to RUNS_COLUMNS array:
{
  key: 'first_click_rank',
  label: 'First Click',
  type: 'number',
  width: 90,
  align: 'right',
  sortable: true,
  hideable: true,
  defaultVisible: false,     // hidden by default, user can enable
  format: (v) => v !== null ? `#${v}` : '—',
  tooltip: 'Rank position of first clicked result',
},
```

**That is the only change required.** The `DataTable` component automatically:
- Renders the new column header with sort controls
- Renders the new cell using the `number` type renderer
- Adds it to the column visibility toggle dropdown
- Respects `defaultVisible: false` — off by default

### 5.3 DataTable Config Rendering Flow

```
RUNS_COLUMNS (config array)
     ↓
DataTable<MockSearchRun>
     ↓ maps columns
<thead>
  <th> for each visible column
    └── sortable ? <SortButton> : <span>
<tbody>
  <tr> for each row
    └── <td> for each column
          └── CellValue<col.type>
                ├── type=badge   → <span className={badgeVariant(value)}>
                ├── type=score   → <ProgressBar> + <span>
                ├── type=tags    → <chip> × min(3, n) + overflow
                ├── type=date    → formatDate(value)
                ├── type=duration→ formatDuration(value)
                └── type=text    → col.format ? col.format(value) : value
```

### 5.4 Filter Config Rendering Flow

```
RUNS_FILTERS (config array)
     ↓
FiltersPanel
     ↓ maps filters
<div.flex.gap-2>
  for each filter:
    ├── type=multiselect  → <MultiSelect>
    ├── type=select       → <select>
    ├── type=daterange    → <input[date]> ~ <input[date]>
    ├── type=text         → <input[text]>
    ├── type=range        → <input[range]>
    └── type=toggle       → <ToggleSwitch>
```

---

## 6. Error Handling Strategy

### 6.1 Network Errors

```typescript
// When TanStack Query is integrated:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      onError: (error) => toast.error(`Request failed: ${error.message}`),
    },
  },
});
```

### 6.2 Empty States

```typescript
// DataTable renders EmptyRow when data.length === 0
<tr>
  <td colSpan={visibleColumns.length} className="text-center py-12 text-gray-400">
    {emptyMessage}  // prop: "No runs match the current filters"
  </td>
</tr>
```

### 6.3 Job Failures

```
RunDetailDrawer
└── TimelineTab
    └── JobTimeline
        ├── StepRow (status=failed) → XCircle icon (red)
        ├── ErrorBlock → bg-red-50 card
        │   error_code (bold)
        │   error_message (detail)
        └── RetryButton (when job_status === 'FAILED' && role === 'ADMIN')
```

### 6.4 Provider Timeouts

```
ConfigPage → ProvidersTab
└── ProviderRow
    └── HealthBadge
        color: success_rate >= 0.95 → green
               success_rate >= 0.80 → amber (with warning icon)
               success_rate <  0.80 → red (with AlertTriangle icon)
```

### 6.5 Config Validation Errors

```
ConfigPage → WeightsTab → WeightConfigCard
└── ValidationError (renders when validateWeights() returns string)
    └── AlertTriangle icon + error message
    + SaveButton disabled until error resolved
    + WeightSumBadge turns red (Σ ≠ 1.000)
```

---

## 7. Performance Optimization

### 7.1 Virtual Scroll (1,000+ rows)

For production with real API data:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: sortedData.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 40,          // px per row
  overscan: 10,
});

// Render only visible rows
rowVirtualizer.getVirtualItems().map(vRow => (
  <tr key={vRow.key} style={{ transform: `translateY(${vRow.start}px)` }}>
    {renderRow(sortedData[vRow.index])}
  </tr>
))
```

The MVP uses standard pagination (50 rows/page) which achieves similar performance without the virtual scroll complexity.

### 7.2 Memoization

```typescript
// In RunsPage:
const filtered  = useMemo(() => applyFilters(ALL_RUNS, filters), [filters]);
const kpis      = useMemo(() => computeKPIs(filtered), [filtered]);
const paginated = useMemo(() => filtered.slice(start, end), [filtered, page, pageSize]);

// In DataTable:
const visibleColumns = useMemo(() => columns.filter(c => visibleCols.has(c.key)), [columns, visibleCols]);
const sortedData     = useMemo(() => sortRows(data, sort), [data, sort]);
```

### 7.3 Debounced Filter Inputs

```typescript
// Text filters debounce at 300ms to avoid filtering on every keystroke
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// In FiltersPanel TextFilter:
const debouncedValue = useDebounced(localValue, 300);
useEffect(() => { onChange(debouncedValue); }, [debouncedValue]);
```

### 7.4 Code Splitting

```typescript
// Heavy panels loaded lazily (Next.js dynamic imports)
const RunDetailDrawer = dynamic(
  () => import('@/components/admin/RunDetailDrawer'),
  { loading: () => <DrawerSkeleton /> }
);

const CompareDrawer = dynamic(
  () => import components/admin/CompareDrawer')
);
```

### 7.5 Mock Data Singleton

```typescript
// generators.ts: module-level cache
let _cachedRuns: MockSearchRun[] | null = null;

export function generateSearchRuns(count = 1000): MockSearchRun[] {
  if (_cachedRuns && _cachedRuns.length >= count) return _cachedRuns.slice(0, count);
  _cachedRuns = Array.from({ length: count }, (_, i) => genSingleRun(i));
  return _cachedRuns;
}
// First call: ~10ms to generate 1,000 runs
// Subsequent calls: O(1) — returns cached reference
```

### 7.6 Optimization Summary

| Problem | Solution | Expected Gain |
|---------|----------|---------------|
| 1,000 row renders | Pagination (50/page) or virtual scroll | 20× fewer DOM nodes |
| Filter recompute on every render | `useMemo` with dependency array | Skips on unrelated state changes |
| Text filter triggers filter per keystroke | 300ms debounce | 5–10× fewer filter executions |
| Drawer bundle loaded upfront | `next/dynamic` lazy import | −30–50KB initial bundle |
| Mock data regenerated on each import | Module-level `_cachedRuns` | O(1) after first call |
| Sort of large arrays | `useMemo` with `[data, sort]` deps | Only re-sorts when data or sort changes |

---

## 8. File Structure Reference

```
frontend/src/
├── app/
│   └── admin/
│       ├── layout.tsx              # AdminLayout shell
│       ├── page.tsx                # redirect → /admin/runs
│       ├── runs/page.tsx           # Search Runs page
│       ├── jobs/page.tsx           # Job Observability page
│       ├── ranking/page.tsx        # Ranking Debugger page
│       └── config/page.tsx         # Config Studio page
│
├── components/
│   └── admin/
│       ├── AdminNav.tsx            # Sidebar navigation
│       ├── DataTable.tsx           # Config-driven generic table
│       ├── FiltersPanel.tsx        # Config-driven filter bar
│       ├── KPIBar.tsx              # KPI metric cards (6 cards)
│       ├── JobTimeline.tsx         # Step-level job timeline
│       ├── RunDetailDrawer.tsx     # Run detail slide-over drawer
│       └── Pagination.tsx          # Page controls
│
├── configs/
│   └── console/
│       ├── columns.ts              # ColumnDef[] for each page
│       ├── filters.ts              # FilterDef[] for each page
│       └── policies.ts             # RankingPolicyConfig + thresholds
│
└── lib/
    └── mock/
        ├── generators.ts           # Deterministic mock data (1,000 runs)
        └── index.ts                # Re-exports
```

---

*Document maintained by the FMD engineering team.*
*Component code: `frontend/src/components/admin/` | Config: `frontend/src/configs/console/`*
