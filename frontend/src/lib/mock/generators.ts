/**
 * Mock data generators for Enterprise Console
 * Generates 1,000+ SearchRuns with realistic distributions
 */

// ─── Seeded random (deterministic — same output on server & client) ───────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Module-level RNG — initialized once with fixed seed 42
// All calls are deterministic: server SSR and client hydration produce identical output
let _rng = seededRandom(42);

function rngReset() { _rng = seededRandom(42); }

// UUID using seeded RNG (no Math.random — prevents hydration mismatch)
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(_rng() * 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export type JobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type InputMode = 'text' | 'canvas';

export interface JobStep {
  step: number;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  detail?: string;
}

export interface MockSearchResult {
  result_id: string;
  rank: number;
  title: string;
  image_url: string | null;
  product_url: string | null;
  price: number | null;
  provider: string;
  score_overall: number;
  score_keyword: number;
  score_color: number;
  score_embedding: number;
  explanation: string[];
  clicked: boolean;
  click_rank?: number;
}

export interface MockSearchRun {
  run_id: string;
  design_id: string;
  job_id: string;
  session_id: string;
  created_at: string;
  finished_at: string | null;
  input_mode: InputMode;
  category: string;
  query_summary: string;
  keywords: string[];
  dominant_color: string;
  ai_image_url: string | null;
  job_status: JobStatus;
  job_steps: JobStep[];
  duration_ms: number | null;
  results_count: number;
  provider_mix: string[];
  error_code: string | null;
  error_message: string | null;
  top_results: MockSearchResult[];
  // Analytics
  ctr: number | null;      // click-through rate
  first_click_rank: number | null;
  feature_flags: string[];
}

export interface MockConfigChange {
  change_id: string;
  changed_at: string;
  changed_by: string;
  config_key: string;
  old_value: unknown;
  new_value: unknown;
  reason: string;
  feature_flag?: string;
}

export interface MockProvider {
  id: string;
  name: string;
  base_url: string;
  enabled: boolean;
  avg_latency_ms: number;
  success_rate: number;
  result_count_avg: number;
}

export interface MockRankingConfig {
  version: number;
  w_keyword: number;
  w_color: number;
  w_embedding: number;
  w_meta: number;
  penalty_no_image: number;
  penalty_duplicate: number;
  penalty_negative_kw: number;
  dedupe_policy: 'url' | 'title_similarity' | 'none';
  feature_flag?: string;
  created_at: string;
  created_by: string;
}

export interface MockFeatureFlag {
  key: string;
  enabled: boolean;
  variant_pct: number;
  description: string;
  created_at: string;
  expires_at: string | null;
  owner: string;
}

// ─── Helpers using module-level seeded _rng ──────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(_rng() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(_rng() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 3): number {
  return parseFloat((_rng() * (max - min) + min).toFixed(decimals));
}

function randBool(prob = 0.5): boolean {
  return _rng() < prob;
}

// ─── Reference data ───────────────────────────────────────────────────────────

const CATEGORIES = ['logo', 'banner', 'icon', 'illustration', 'template', 'ui-kit', 'pattern', 'mockup'];
const INPUT_MODES: InputMode[] = ['text', 'canvas'];
const PROVIDERS = ['mock', 'freepik', 'envato', 'creative_market', 'dribble_crawl'];
const ERROR_CODES = ['PROVIDER_TIMEOUT', 'AI_QUOTA_EXCEEDED', 'PROFILE_PARSE_FAIL', 'NO_RESULTS', 'WORKER_CRASH'];
const FEATURE_FLAGS = ['ranking_weights_v1', 'color_boost_exp', 'new_provider_envato', 'embedding_v2'];

const QUERY_TEMPLATES = [
  'minimalist {cat} with {color} tones',
  'modern {cat} design for {industry}',
  'flat {cat} icon pack',
  '{adj} {cat} template set',
  'professional {cat} for {industry} brand',
  'vintage-style {cat} with {color}',
  'abstract {cat} background',
  '{color} gradient {cat}',
  'hand-drawn {cat} elements',
  'corporate {cat} presentation',
];

const COLORS = ['blue', 'red', 'green', 'purple', 'orange', 'teal', 'pink', 'gold', 'dark', 'white'];
const INDUSTRIES = ['tech', 'finance', 'healthcare', 'food', 'retail', 'education', 'real estate', 'startup'];
const ADJECTIVES = ['clean', 'bold', 'elegant', 'playful', 'luxurious', 'minimal', 'vibrant', 'sleek'];

const DOMINANT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B',
  '#14B8A6', '#EC4899', '#F97316', '#1F2937', '#F3F4F6',
];

const SAMPLE_TITLES = [
  'Premium Logo Bundle Vol.3', 'Flat Icon Set 200+', 'Brand Identity Kit',
  'UI Component Library', 'Social Media Templates', 'Typography Poster Pack',
  'Abstract Background Collection', 'Business Card Templates', 'Infographic Pack',
  'Photo Mockup Bundle', 'Web UI Kit Dark Mode', 'Motion Graphics Elements',
  'Illustration Pack — Office', 'Data Visualization Kit', 'App Icon Set iOS/Android',
];

const STEP_LABELS = [
  'Profile Generation',
  'AI Image Synthesis',
  'Provider Search',
  'Ranking & Dedup',
];

// ─── Generators ───────────────────────────────────────────────────────────────

function genDate(daysAgo: number, hoursJitter = 12): string {
  const base = new Date('2026-03-04T00:00:00Z');
  base.setDate(base.getDate() - daysAgo);
  base.setHours(base.getHours() - Math.floor(_rng() * hoursJitter));
  base.setMinutes(Math.floor(_rng() * 60));
  return base.toISOString();
}

function genQuerySummary(category: string): string {
  const tpl = pick(QUERY_TEMPLATES);
  return tpl
    .replace('{cat}', category)
    .replace('{color}', pick(COLORS))
    .replace('{industry}', pick(INDUSTRIES))
    .replace('{adj}', pick(ADJECTIVES));
}

function genKeywords(category: string): string[] {
  const base = [category, pick(COLORS), pick(ADJECTIVES)];
  if (randBool(0.6)) base.push(pick(INDUSTRIES));
  if (randBool(0.4)) base.push('professional');
  if (randBool(0.3)) base.push('vector');
  return [...new Set(base)];
}

function genJobSteps(status: JobStatus, durationMs: number): JobStep[] {
  const stepCount = status === 'FAILED' ? randInt(1, 3) : 4;
  const startTime = new Date('2026-03-04T10:00:00Z');
  const stepDurations = [
    randInt(200, 800),    // profile
    randInt(800, 2500),   // AI image
    randInt(500, 1500),   // search
    randInt(100, 400),    // ranking
  ];

  return STEP_LABELS.slice(0, 4).map((label, i) => {
    const started = new Date(startTime.getTime() + stepDurations.slice(0, i).reduce((a, b) => a + b, 0));
    const finished = new Date(started.getTime() + stepDurations[i]);

    let stepStatus: JobStep['status'] = 'pending';
    if (i < stepCount - 1) stepStatus = 'done';
    else if (i === stepCount - 1) {
      stepStatus = status === 'FAILED' ? 'failed' : status === 'RUNNING' ? 'running' : 'done';
    }

    return {
      step: i + 1,
      label,
      status: stepStatus,
      started_at: stepStatus !== 'pending' ? started.toISOString() : undefined,
      finished_at: stepStatus === 'done' ? finished.toISOString() : undefined,
      duration_ms: stepStatus === 'done' ? stepDurations[i] : undefined,
      detail: stepStatus === 'failed' ? `Error at step ${i + 1}` : undefined,
    };
  });
}

function genResults(
  runId: string,
  count: number,
  keywords: string[],
  dominantColor: string,
  providers: string[],
): MockSearchResult[] {
  return Array.from({ length: count }, (_, i) => {
    const rank = i + 1;
    const score_keyword = randFloat(0.1, 1.0);
    const score_color = randFloat(0.1, 1.0);
    const score_embedding = randFloat(0.1, 1.0);
    const score_overall = score_keyword * 0.45 + score_color * 0.20 + score_embedding * 0.30 + 0.05;
    const clicked = i < 5 && randBool(0.25);

    const explanations: string[] = [];
    if (score_keyword > 0.6) explanations.push(`keyword match: ${keywords[0]}`);
    if (score_color > 0.6) explanations.push(`color match: ${dominantColor}`);
    if (score_embedding > 0.7) explanations.push('visual similarity: high');

    return {
      result_id: uuidv4(),
      rank,
      title: pick(SAMPLE_TITLES),
      image_url: `https://picsum.photos/seed/${runId.slice(0, 8)}${i}/300/200`,
      product_url: `https://example.com/product/${runId.slice(0, 8)}-${i}`,
      price: randBool(0.7) ? randFloat(5, 99, 2) : null,
      provider: pick(providers),
      score_overall: Math.min(score_overall, 1),
      score_keyword,
      score_color,
      score_embedding,
      explanation: explanations.length ? explanations : ['general relevance'],
      clicked,
      click_rank: clicked ? rank : undefined,
    };
  });
}

function genSingleRun(index: number): MockSearchRun {
  const run_id = uuidv4();
  const design_id = uuidv4();
  const job_id = uuidv4();
  const session_id = uuidv4();

  const category = pick(CATEGORIES);
  const input_mode = pick(INPUT_MODES);
  const daysAgo = Math.floor(index / 15);   // ~15 runs/day over 70 days
  const created_at = genDate(daysAgo);

  // Status distribution: 85% success, 10% failed, 5% running/queued
  let job_status: JobStatus;
  const r = _rng();
  if (r < 0.85) job_status = 'SUCCEEDED';
  else if (r < 0.95) job_status = 'FAILED';
  else if (r < 0.98) job_status = 'RUNNING';
  else job_status = 'QUEUED';

  const duration_ms = job_status === 'SUCCEEDED' ? randInt(1200, 6000) :
    job_status === 'FAILED' ? randInt(200, 3000) : null;

  const providerCount = randInt(1, 3);
  const provider_mix = PROVIDERS.slice(0, providerCount + 1)
    .sort(() => _rng() - 0.5)
    .slice(0, providerCount);

  const error_code = job_status === 'FAILED' ? pick(ERROR_CODES) : null;
  const results_count = job_status === 'SUCCEEDED' ? randInt(3, 20) : 0;

  const keywords = genKeywords(category);
  const dominant_color = pick(DOMINANT_COLORS);
  const feature_flags = randBool(0.3) ? [pick(FEATURE_FLAGS)] : [];

  const top_results = job_status === 'SUCCEEDED'
    ? genResults(run_id, Math.min(results_count, 10), keywords, dominant_color, provider_mix)
    : [];

  const clickedResults = top_results.filter(r => r.clicked);
  const ctr = job_status === 'SUCCEEDED' ? (clickedResults.length > 0 ? 1 : 0) : null;
  const first_click_rank = clickedResults.length > 0
    ? Math.min(...clickedResults.map(r => r.click_rank!))
    : null;

  const finished_at = duration_ms
    ? new Date(new Date(created_at).getTime() + duration_ms).toISOString()
    : null;

  return {
    run_id,
    design_id,
    job_id,
    session_id,
    created_at,
    finished_at,
    input_mode,
    category,
    query_summary: genQuerySummary(category),
    keywords,
    dominant_color,
    ai_image_url: job_status === 'SUCCEEDED' ? `https://picsum.photos/seed/${run_id.slice(0, 8)}/512/512` : null,
    job_status,
    job_steps: genJobSteps(job_status, duration_ms || 1000),
    duration_ms,
    results_count,
    provider_mix,
    error_code,
    error_message: error_code ? `${error_code}: Operation failed after 3 retries` : null,
    top_results,
    ctr,
    first_click_rank,
    feature_flags,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

let _cachedRuns: MockSearchRun[] | null = null;

export function generateSearchRuns(count = 1000): MockSearchRun[] {
  if (_cachedRuns && _cachedRuns.length >= count) return _cachedRuns.slice(0, count);
  rngReset(); // always reset to seed 42 → identical output on server & client
  _cachedRuns = Array.from({ length: count }, (_, i) => genSingleRun(i));
  return _cachedRuns;
}

export function generateProviders(): MockProvider[] {
  return [
    { id: 'mock', name: 'Mock Provider', base_url: 'internal://', enabled: true, avg_latency_ms: 120, success_rate: 0.99, result_count_avg: 15 },
    { id: 'freepik', name: 'Freepik', base_url: 'https://freepik.com', enabled: true, avg_latency_ms: 880, success_rate: 0.93, result_count_avg: 8 },
    { id: 'envato', name: 'Envato Elements', base_url: 'https://elements.envato.com', enabled: false, avg_latency_ms: 1200, success_rate: 0.87, result_count_avg: 6 },
    { id: 'creative_market', name: 'Creative Market', base_url: 'https://creativemarket.com', enabled: true, avg_latency_ms: 950, success_rate: 0.91, result_count_avg: 5 },
    { id: 'dribble_crawl', name: 'Dribbble Crawl', base_url: 'https://dribbble.com', enabled: false, avg_latency_ms: 1500, success_rate: 0.75, result_count_avg: 4 },
  ];
}

export function generateRankingConfig(): MockRankingConfig {
  return {
    version: 3,
    w_keyword: 0.45,
    w_color: 0.20,
    w_embedding: 0.30,
    w_meta: 0.05,
    penalty_no_image: 0.20,
    penalty_duplicate: 0.10,
    penalty_negative_kw: 0.40,
    dedupe_policy: 'url',
    created_at: '2026-02-15T09:00:00Z',
    created_by: 'admin@fmd.dev',
  };
}

export function generateConfigChanges(): MockConfigChange[] {
  const changes: MockConfigChange[] = [
    {
      change_id: uuidv4(),
      changed_at: '2026-02-28T14:22:00Z',
      changed_by: 'analyst@fmd.dev',
      config_key: 'w_color',
      old_value: 0.20,
      new_value: 0.30,
      reason: 'Experiment: color_boost_exp — logo category CTR improvement test',
      feature_flag: 'color_boost_exp',
    },
    {
      change_id: uuidv4(),
      changed_at: '2026-02-20T11:05:00Z',
      changed_by: 'admin@fmd.dev',
      config_key: 'providers.envato.enabled',
      old_value: true,
      new_value: false,
      reason: 'Provider latency p95 exceeded 3s threshold consistently',
    },
    {
      change_id: uuidv4(),
      changed_at: '2026-02-15T09:00:00Z',
      changed_by: 'admin@fmd.dev',
      config_key: 'ranking_config',
      old_value: { w_keyword: 0.50, w_color: 0.15, w_embedding: 0.30, w_meta: 0.05 },
      new_value: { w_keyword: 0.45, w_color: 0.20, w_embedding: 0.30, w_meta: 0.05 },
      reason: 'Ranking v2: rebalance keyword/color weights based on A/B test results',
    },
    {
      change_id: uuidv4(),
      changed_at: '2026-01-30T16:40:00Z',
      changed_by: 'admin@fmd.dev',
      config_key: 'dedupe_policy',
      old_value: 'none',
      new_value: 'url',
      reason: 'Fix duplicate results issue reported by users',
    },
    {
      change_id: uuidv4(),
      changed_at: '2026-01-10T08:15:00Z',
      changed_by: 'admin@fmd.dev',
      config_key: 'penalty_negative_kw',
      old_value: 0.30,
      new_value: 0.40,
      reason: 'Increase negative keyword penalty to reduce irrelevant results',
    },
  ];
  return changes;
}

export function generateFeatureFlags(): MockFeatureFlag[] {
  return [
    {
      key: 'ranking_weights_v1',
      enabled: true,
      variant_pct: 50,
      description: 'A/B test: new ranking weight distribution (w_color +0.10)',
      created_at: '2026-02-25T00:00:00Z',
      expires_at: '2026-03-10T00:00:00Z',
      owner: 'analyst@fmd.dev',
    },
    {
      key: 'color_boost_exp',
      enabled: true,
      variant_pct: 30,
      description: 'Experiment: boost color score weight for logo/icon categories',
      created_at: '2026-02-28T00:00:00Z',
      expires_at: '2026-03-14T00:00:00Z',
      owner: 'analyst@fmd.dev',
    },
    {
      key: 'new_provider_envato',
      enabled: false,
      variant_pct: 0,
      description: 'Canary: re-enable Envato Elements provider with circuit breaker',
      created_at: '2026-03-01T00:00:00Z',
      expires_at: null,
      owner: 'admin@fmd.dev',
    },
    {
      key: 'embedding_v2',
      enabled: false,
      variant_pct: 0,
      description: 'Test: upgraded CLIP model for embedding generation',
      created_at: '2026-03-03T00:00:00Z',
      expires_at: null,
      owner: 'admin@fmd.dev',
    },
  ];
}

// ─── KPI Aggregations ─────────────────────────────────────────────────────────

export interface KPIStats {
  total_runs: number;
  success_rate: number;
  fail_rate: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  ctr_at_10: number;
  zero_result_rate: number;
  avg_results_count: number;
}

export function computeKPIs(runs: MockSearchRun[]): KPIStats {
  const succeeded = runs.filter(r => r.job_status === 'SUCCEEDED');
  const failed = runs.filter(r => r.job_status === 'FAILED');
  const durations = succeeded.map(r => r.duration_ms!).filter(Boolean).sort((a, b) => a - b);
  const clicks = succeeded.filter(r => r.ctr && r.ctr > 0);
  const zeroResults = succeeded.filter(r => r.results_count === 0);

  const p95Index = Math.floor(durations.length * 0.95);

  return {
    total_runs: runs.length,
    success_rate: succeeded.length / runs.length,
    fail_rate: failed.length / runs.length,
    avg_duration_ms: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    p95_duration_ms: durations[p95Index] ?? 0,
    ctr_at_10: succeeded.length ? clicks.length / succeeded.length : 0,
    zero_result_rate: succeeded.length ? zeroResults.length / succeeded.length : 0,
    avg_results_count: succeeded.length
      ? succeeded.reduce((a, r) => a + r.results_count, 0) / succeeded.length
      : 0,
  };
}
