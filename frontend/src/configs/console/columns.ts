/**
 * configuration-driven column definitions for Enterprise Console tables.
 * Adding a new column = add one entry here. No component code changes needed.
 */

export type ColumnAlign = 'left' | 'center' | 'right';
export type ColumnType =
  | 'text'
  | 'date'
  | 'badge'
  | 'number'
  | 'duration'
  | 'score'
  | 'tags'
  | 'color_dot'
  | 'link'
  | 'actions';

export interface ColumnDef<T = Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  type: ColumnType;
  width?: number;          // px
  minWidth?: number;
  align?: ColumnAlign;
  sortable?: boolean;
  hideable?: boolean;
  defaultVisible?: boolean;
  format?: (value: unknown, row: T) => string | null;
  badgeVariant?: (value: unknown) => 'success' | 'error' | 'warning' | 'info' | 'neutral';
  tooltip?: string;
}

// ─── Search Runs Table ────────────────────────────────────────────────────────

import type { MockSearchRun } from '@/lib/mock/generators';

export const RUNS_COLUMNS: ColumnDef<MockSearchRun>[] = [
  {
    key: 'run_id',
    label: 'Run ID',
    type: 'text',
    width: 120,
    sortable: false,
    hideable: true,
    defaultVisible: true,
    format: (v) => String(v).slice(0, 8) + '…',
    tooltip: 'Unique identifier for this search run',
  },
  {
    key: 'created_at',
    label: 'Created',
    type: 'date',
    width: 160,
    sortable: true,
    defaultVisible: true,
  },
  {
    key: 'input_mode',
    label: 'Mode',
    type: 'badge',
    width: 80,
    align: 'center',
    sortable: true,
    defaultVisible: true,
    badgeVariant: (v) => v === 'text' ? 'info' : 'neutral',
  },
  {
    key: 'category',
    label: 'Category',
    type: 'badge',
    width: 100,
    align: 'center',
    sortable: true,
    defaultVisible: true,
    badgeVariant: () => 'neutral',
  },
  {
    key: 'query_summary',
    label: 'Query',
    type: 'text',
    minWidth: 200,
    sortable: false,
    defaultVisible: true,
    format: (v) => {
      const s = String(v);
      return s.length > 60 ? s.slice(0, 57) + '…' : s;
    },
  },
  {
    key: 'job_status',
    label: 'Status',
    type: 'badge',
    width: 110,
    align: 'center',
    sortable: true,
    defaultVisible: true,
    badgeVariant: (v) => {
      if (v === 'SUCCEEDED') return 'success';
      if (v === 'FAILED') return 'error';
      if (v === 'RUNNING') return 'warning';
      return 'neutral';
    },
  },
  {
    key: 'duration_ms',
    label: 'Duration',
    type: 'duration',
    width: 100,
    align: 'right',
    sortable: true,
    defaultVisible: true,
    tooltip: 'End-to-end job processing time',
  },
  {
    key: 'results_count',
    label: 'Results',
    type: 'number',
    width: 80,
    align: 'right',
    sortable: true,
    defaultVisible: true,
  },
  {
    key: 'provider_mix',
    label: 'Providers',
    type: 'tags',
    width: 160,
    sortable: false,
    hideable: true,
    defaultVisible: true,
  },
  {
    key: 'error_code',
    label: 'Error',
    type: 'badge',
    width: 160,
    sortable: true,
    hideable: true,
    defaultVisible: true,
    badgeVariant: (v) => v ? 'error' : 'neutral',
    format: (v) => v ? String(v) : '—',
  },
  {
    key: 'dominant_color',
    label: 'Color',
    type: 'color_dot',
    width: 60,
    align: 'center',
    hideable: true,
    defaultVisible: false,
  },
  {
    key: 'ctr',
    label: 'CTR',
    type: 'score',
    width: 70,
    align: 'right',
    sortable: true,
    hideable: true,
    defaultVisible: false,
    format: (v) => v !== null && v !== undefined ? `${(Number(v) * 100).toFixed(0)}%` : '—',
    tooltip: 'Click-through rate (at least one result clicked)',
  },
];

// ─── Jobs Table ───────────────────────────────────────────────────────────────

export interface JobRow {
  job_id: string;
  run_id: string;
  created_at: string;
  finished_at: string | null;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress: number;
  duration_ms: number | null;
  error_code: string | null;
  design_id: string;
  category: string;
  input_mode: string;
}

export const JOBS_COLUMNS: ColumnDef<JobRow>[] = [
  {
    key: 'job_id',
    label: 'Job ID',
    type: 'text',
    width: 120,
    format: (v) => String(v).slice(0, 8) + '…',
  },
  {
    key: 'created_at',
    label: 'Started',
    type: 'date',
    width: 160,
    sortable: true,
    defaultVisible: true,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'badge',
    width: 110,
    align: 'center',
    sortable: true,
    defaultVisible: true,
    badgeVariant: (v) => {
      if (v === 'SUCCEEDED') return 'success';
      if (v === 'FAILED') return 'error';
      if (v === 'RUNNING') return 'warning';
      return 'neutral';
    },
  },
  {
    key: 'progress',
    label: 'Progress',
    type: 'score',
    width: 100,
    align: 'center',
    defaultVisible: true,
    format: (v) => `${Number(v)}%`,
  },
  {
    key: 'duration_ms',
    label: 'Duration',
    type: 'duration',
    width: 100,
    align: 'right',
    sortable: true,
    defaultVisible: true,
  },
  {
    key: 'category',
    label: 'Category',
    type: 'badge',
    width: 100,
    badgeVariant: () => 'neutral',
    defaultVisible: true,
  },
  {
    key: 'input_mode',
    label: 'Mode',
    type: 'badge',
    width: 80,
    badgeVariant: (v) => v === 'text' ? 'info' : 'neutral',
    defaultVisible: true,
  },
  {
    key: 'error_code',
    label: 'Error',
    type: 'badge',
    width: 180,
    badgeVariant: (v) => v ? 'error' : 'neutral',
    format: (v) => v ? String(v) : '—',
    defaultVisible: true,
  },
  {
    key: 'run_id',
    label: 'Run',
    type: 'link',
    width: 120,
    format: (v) => String(v).slice(0, 8) + '…',
    defaultVisible: true,
  },
];

// ─── Ranking Debugger Table ───────────────────────────────────────────────────

export interface RankingRow {
  result_id: string;
  run_id: string;
  rank: number;
  title: string;
  provider: string;
  score_overall: number;
  score_keyword: number;
  score_color: number;
  score_embedding: number;
  price: number | null;
  clicked: boolean;
  explanation: string[];
}

export const RANKING_COLUMNS: ColumnDef<RankingRow>[] = [
  {
    key: 'rank',
    label: '#',
    type: 'number',
    width: 48,
    align: 'center',
    sortable: true,
    defaultVisible: true,
  },
  {
    key: 'title',
    label: 'Title',
    type: 'text',
    minWidth: 200,
    sortable: false,
    defaultVisible: true,
    format: (v) => {
      const s = String(v);
      return s.length > 50 ? s.slice(0, 47) + '…' : s;
    },
  },
  {
    key: 'provider',
    label: 'Provider',
    type: 'badge',
    width: 130,
    badgeVariant: () => 'info',
    defaultVisible: true,
  },
  {
    key: 'score_overall',
    label: 'Overall',
    type: 'score',
    width: 90,
    align: 'right',
    sortable: true,
    defaultVisible: true,
    format: (v) => Number(v).toFixed(3),
    tooltip: 'Weighted composite score',
  },
  {
    key: 'score_keyword',
    label: 'Keyword',
    type: 'score',
    width: 90,
    align: 'right',
    sortable: true,
    defaultVisible: true,
    format: (v) => Number(v).toFixed(3),
  },
  {
    key: 'score_color',
    label: 'Color',
    type: 'score',
    width: 80,
    align: 'right',
    sortable: true,
    defaultVisible: true,
    format: (v) => Number(v).toFixed(3),
  },
  {
    key: 'score_embedding',
    label: 'Embedding',
    type: 'score',
    width: 90,
    align: 'right',
    sortable: true,
    defaultVisible: true,
    format: (v) => Number(v).toFixed(3),
  },
  {
    key: 'price',
    label: 'Price',
    type: 'number',
    width: 80,
    align: 'right',
    sortable: true,
    defaultVisible: true,
    format: (v) => v !== null && v !== undefined ? `$${Number(v).toFixed(2)}` : 'Free',
  },
  {
    key: 'clicked',
    label: 'Clicked',
    type: 'badge',
    width: 80,
    align: 'center',
    sortable: true,
    defaultVisible: true,
    badgeVariant: (v) => v ? 'success' : 'neutral',
    format: (v) => v ? 'Yes' : 'No',
  },
];
