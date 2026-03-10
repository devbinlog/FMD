/**
 * Configuration-driven filter definitions for Enterprise Console.
 * Adding a new filter = add one entry here. No component code changes needed.
 */

export type FilterType = 'daterange' | 'multiselect' | 'select' | 'text' | 'range' | 'toggle';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;   // shown in dropdown
}

export interface FilterDef {
  key: string;
  label: string;
  type: FilterType;
  placeholder?: string;
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
  width?: number;
  clearable?: boolean;
  defaultValue?: unknown;
  tooltip?: string;
}

export interface FilterValues {
  [key: string]: unknown;
}

// ─── Runs Page Filters ────────────────────────────────────────────────────────

export const RUNS_FILTERS: FilterDef[] = [
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'daterange',
    width: 220,
    clearable: true,
    defaultValue: null,
    tooltip: 'Filter by run creation date',
  },
  {
    key: 'job_status',
    label: 'Status',
    type: 'multiselect',
    width: 180,
    clearable: true,
    options: [
      { value: 'SUCCEEDED', label: 'Succeeded' },
      { value: 'FAILED', label: 'Failed' },
      { value: 'RUNNING', label: 'Running' },
      { value: 'QUEUED', label: 'Queued' },
    ],
  },
  {
    key: 'input_mode',
    label: 'Input Mode',
    type: 'multiselect',
    width: 160,
    clearable: true,
    options: [
      { value: 'text', label: 'Text' },
      { value: 'canvas', label: 'Canvas' },
    ],
  },
  {
    key: 'category',
    label: 'Category',
    type: 'multiselect',
    width: 160,
    clearable: true,
    options: [
      { value: 'logo', label: 'Logo' },
      { value: 'banner', label: 'Banner' },
      { value: 'icon', label: 'Icon' },
      { value: 'illustration', label: 'Illustration' },
      { value: 'template', label: 'Template' },
      { value: 'ui-kit', label: 'UI Kit' },
      { value: 'pattern', label: 'Pattern' },
      { value: 'mockup', label: 'Mockup' },
    ],
  },
  {
    key: 'provider',
    label: 'Provider',
    type: 'multiselect',
    width: 180,
    clearable: true,
    options: [
      { value: 'mock', label: 'Mock' },
      { value: 'freepik', label: 'Freepik' },
      { value: 'envato', label: 'Envato' },
      { value: 'creative_market', label: 'Creative Market' },
      { value: 'dribble_crawl', label: 'Dribbble' },
    ],
  },
  {
    key: 'error_code',
    label: 'Error Code',
    type: 'select',
    width: 200,
    clearable: true,
    options: [
      { value: 'PROVIDER_TIMEOUT', label: 'Provider Timeout' },
      { value: 'AI_QUOTA_EXCEEDED', label: 'AI Quota Exceeded' },
      { value: 'PROFILE_PARSE_FAIL', label: 'Profile Parse Fail' },
      { value: 'NO_RESULTS', label: 'No Results' },
      { value: 'WORKER_CRASH', label: 'Worker Crash' },
    ],
    tooltip: 'Filter failed runs by specific error code',
  },
  {
    key: 'duration',
    label: 'Duration (ms)',
    type: 'range',
    min: 0,
    max: 10000,
    step: 100,
    width: 200,
    tooltip: 'Filter by job duration range',
  },
  {
    key: 'query',
    label: 'Query',
    type: 'text',
    placeholder: 'Search query summary…',
    width: 220,
    clearable: true,
  },
];

// ─── Jobs Page Filters ────────────────────────────────────────────────────────

export const JOBS_FILTERS: FilterDef[] = [
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'daterange',
    width: 220,
    clearable: true,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'multiselect',
    width: 180,
    clearable: true,
    options: [
      { value: 'SUCCEEDED', label: 'Succeeded' },
      { value: 'FAILED', label: 'Failed' },
      { value: 'RUNNING', label: 'Running' },
      { value: 'QUEUED', label: 'Queued' },
    ],
  },
  {
    key: 'error_code',
    label: 'Error Code',
    type: 'select',
    width: 200,
    clearable: true,
    options: [
      { value: 'PROVIDER_TIMEOUT', label: 'Provider Timeout' },
      { value: 'AI_QUOTA_EXCEEDED', label: 'AI Quota Exceeded' },
      { value: 'PROFILE_PARSE_FAIL', label: 'Profile Parse Fail' },
      { value: 'NO_RESULTS', label: 'No Results' },
      { value: 'WORKER_CRASH', label: 'Worker Crash' },
    ],
  },
  {
    key: 'category',
    label: 'Category',
    type: 'multiselect',
    width: 160,
    clearable: true,
    options: [
      { value: 'logo', label: 'Logo' },
      { value: 'banner', label: 'Banner' },
      { value: 'icon', label: 'Icon' },
      { value: 'illustration', label: 'Illustration' },
      { value: 'template', label: 'Template' },
    ],
  },
];

// ─── Ranking Debugger Filters ─────────────────────────────────────────────────

export const RANKING_FILTERS: FilterDef[] = [
  {
    key: 'run_id',
    label: 'Run ID',
    type: 'text',
    placeholder: 'Enter run ID…',
    width: 220,
  },
  {
    key: 'provider',
    label: 'Provider',
    type: 'multiselect',
    width: 180,
    clearable: true,
    options: [
      { value: 'mock', label: 'Mock' },
      { value: 'freepik', label: 'Freepik' },
      { value: 'envato', label: 'Envato' },
      { value: 'creative_market', label: 'Creative Market' },
      { value: 'dribble_crawl', label: 'Dribbble' },
    ],
  },
  {
    key: 'min_score',
    label: 'Min Overall Score',
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    width: 180,
    defaultValue: 0,
  },
  {
    key: 'clicked_only',
    label: 'Clicked Only',
    type: 'toggle',
    width: 120,
    defaultValue: false,
    tooltip: 'Show only results that were clicked',
  },
];
