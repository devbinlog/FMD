/**
 * Default ranking policies and provider configuration.
 * Changing weights/policies here affects the ConfigStudio defaults
 * and the feature-flag variant overrides.
 */

export interface RankingWeights {
  w_keyword: number;
  w_color: number;
  w_embedding: number;
  w_meta: number;
}

export interface PenaltyPolicy {
  no_image: number;       // 0–1 multiplier deduction
  duplicate_url: number;
  negative_keyword: number;
}

export interface DedupePolicy {
  strategy: 'url' | 'title_similarity' | 'none';
  title_similarity_threshold?: number;  // 0–1, used when strategy='title_similarity'
}

export interface ProviderPolicy {
  id: string;
  name: string;
  enabled: boolean;
  timeout_ms: number;
  max_results: number;
  weight: number;   // relative priority in result merge
}

export interface RankingPolicyConfig {
  version: number;
  description: string;
  weights: RankingWeights;
  penalties: PenaltyPolicy;
  dedupe: DedupePolicy;
  providers: ProviderPolicy[];
}

// ─── Default (control) policy ─────────────────────────────────────────────────

export const DEFAULT_RANKING_POLICY: RankingPolicyConfig = {
  version: 3,
  description: 'Production ranking v3 — rebalanced keyword/color based on Feb A/B test',
  weights: {
    w_keyword: 0.45,
    w_color: 0.20,
    w_embedding: 0.30,
    w_meta: 0.05,
  },
  penalties: {
    no_image: 0.20,
    duplicate_url: 0.10,
    negative_keyword: 0.40,
  },
  dedupe: {
    strategy: 'url',
  },
  providers: [
    { id: 'mock', name: 'Mock Provider', enabled: true, timeout_ms: 500, max_results: 20, weight: 1.0 },
    { id: 'freepik', name: 'Freepik', enabled: true, timeout_ms: 2000, max_results: 15, weight: 0.9 },
    { id: 'envato', name: 'Envato Elements', enabled: false, timeout_ms: 3000, max_results: 10, weight: 0.8 },
    { id: 'creative_market', name: 'Creative Market', enabled: true, timeout_ms: 2500, max_results: 10, weight: 0.7 },
    { id: 'dribble_crawl', name: 'Dribbble Crawl', enabled: false, timeout_ms: 4000, max_results: 8, weight: 0.5 },
  ],
};

// ─── Feature-flag variant configs ─────────────────────────────────────────────

/**
 * Feature flag: ranking_weights_v1
 * Experiment: +0.10 color weight for logo/icon categories
 */
export const RANKING_WEIGHTS_V1_VARIANT: Partial<RankingWeights> = {
  w_keyword: 0.40,
  w_color: 0.30,
  w_embedding: 0.25,
  w_meta: 0.05,
};

/**
 * Feature flag: color_boost_exp
 * Targeted experiment: even stronger color boost (logo category only)
 */
export const COLOR_BOOST_EXP_VARIANT: Partial<RankingWeights> = {
  w_keyword: 0.35,
  w_color: 0.35,
  w_embedding: 0.25,
  w_meta: 0.05,
};

// ─── Policy validation ────────────────────────────────────────────────────────

export function validateWeights(w: RankingWeights): string | null {
  const sum = w.w_keyword + w.w_color + w.w_embedding + w.w_meta;
  if (Math.abs(sum - 1.0) > 0.001) {
    return `Weights must sum to 1.0 (current: ${sum.toFixed(3)})`;
  }
  for (const [key, val] of Object.entries(w)) {
    if (val < 0 || val > 1) {
      return `Weight ${key} must be between 0 and 1`;
    }
  }
  return null;
}

export function validatePenalties(p: PenaltyPolicy): string | null {
  for (const [key, val] of Object.entries(p)) {
    if (val < 0 || val > 1) {
      return `Penalty ${key} must be between 0 and 1`;
    }
  }
  return null;
}

export function applyVariant(
  base: RankingPolicyConfig,
  variant: Partial<RankingWeights>,
): RankingPolicyConfig {
  return {
    ...base,
    weights: { ...base.weights, ...variant },
  };
}

// ─── KPI thresholds (for dashboard alerts) ────────────────────────────────────

export const KPI_THRESHOLDS = {
  fail_rate_warn: 0.05,      // 5% — yellow warning
  fail_rate_critical: 0.10,  // 10% — red alert
  p95_latency_warn_ms: 3000,
  p95_latency_critical_ms: 5000,
  zero_result_warn: 0.08,
  zero_result_critical: 0.15,
  ctr_low_warn: 0.15,        // below 15% CTR is concerning
} as const;
