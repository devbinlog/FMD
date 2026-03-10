'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { BarChart2, ArrowLeftRight, Info } from 'lucide-react';

import { DataTable } from '@/components/admin/DataTable';
import { FiltersPanel } from '@/components/admin/FiltersPanel';

import { RANKING_COLUMNS, type RankingRow } from '@/configs/console/columns';
import { RANKING_FILTERS } from '@/configs/console/filters';
import type { FilterValues } from '@/configs/console/filters';
import { DEFAULT_RANKING_POLICY } from '@/configs/console/policies';

import { generateSearchRuns, type MockSearchResult } from '@/lib/mock/generators';

const ALL_RUNS = generateSearchRuns(1000);

// Flatten all results from succeeded runs
const ALL_RESULTS: (RankingRow & { run_id: string })[] = ALL_RUNS
  .filter(r => r.job_status === 'SUCCEEDED' && r.top_results.length > 0)
  .flatMap(r =>
    r.top_results.map(res => ({
      result_id: res.result_id,
      run_id: r.run_id,
      rank: res.rank,
      title: res.title,
      provider: res.provider,
      score_overall: res.score_overall,
      score_keyword: res.score_keyword,
      score_color: res.score_color,
      score_embedding: res.score_embedding,
      price: res.price,
      clicked: res.clicked,
      explanation: res.explanation,
    }))
  );

// ─── Score Breakdown Component ────────────────────────────────────────────────

function ScoreBreakdown({ result }: { result: RankingRow }) {
  const weights = DEFAULT_RANKING_POLICY.weights;
  const bars = [
    { label: 'Keyword', score: result.score_keyword, weight: weights.w_keyword },
    { label: 'Color', score: result.score_color, weight: weights.w_color },
    { label: 'Embedding', score: result.score_embedding, weight: weights.w_embedding },
  ];

  return (
    <div className="space-y-2.5">
      {bars.map(({ label, score, weight }) => {
        const contribution = score * weight;
        const pct = Math.round(score * 100);
        const barColor = pct > 70 ? 'bg-emerald-400' : pct > 40 ? 'bg-amber-400' : 'bg-red-400';
        return (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{label} (w={weight.toFixed(2)})</span>
              <span className="tabular-nums text-gray-700 font-mono">
                {score.toFixed(3)} → {contribution.toFixed(3)}
              </span>
            </div>
            <div className="bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-xs pt-1 border-t border-gray-100 font-semibold">
        <span className="text-gray-700">Overall Score</span>
        <span className="text-gray-900 tabular-nums font-mono">{result.score_overall.toFixed(4)}</span>
      </div>
    </div>
  );
}

// ─── Compare Drawer ───────────────────────────────────────────────────────────

function CompareDrawer({
  a,
  b,
  onClose,
}: {
  a: RankingRow;
  b: RankingRow;
  onClose: () => void;
}) {
  const diffs = [
    { key: 'score_overall', label: 'Overall' },
    { key: 'score_keyword', label: 'Keyword' },
    { key: 'score_color',   label: 'Color' },
    { key: 'score_embedding', label: 'Embedding' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[540px] bg-white border-l border-gray-200 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Compare Results</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Header row */}
          <div className="grid grid-cols-2 gap-4">
            {[a, b].map((r, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 font-medium mb-1">Rank #{r.rank}</p>
                <p className="text-sm font-semibold text-gray-800 leading-tight">{r.title}</p>
                <p className="text-xs text-gray-500 mt-1">{r.provider}</p>
                {r.clicked && <span className="text-xs text-emerald-600 mt-1 inline-block">● Clicked</span>}
              </div>
            ))}
          </div>

          {/* Score comparison */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score Comparison</h3>
            {diffs.map(({ key, label }) => {
              const va = a[key] as number;
              const vb = b[key] as number;
              const diff = vb - va;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{label}</span>
                    <span className={['tabular-nums font-mono font-semibold', diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'].join(' ')}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-0.5 text-right">{va.toFixed(3)}</div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full bg-blue-400" style={{ width: `${va * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-gray-300 text-xs self-end">vs</div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-0.5">{vb.toFixed(3)}</div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${diff >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${vb * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanations */}
          <div className="grid grid-cols-2 gap-4">
            {[a, b].map((r, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-gray-500 mb-2">Explanation #{i + 1}</p>
                <ul className="space-y-1">
                  {r.explanation.map((e, j) => (
                    <li key={j} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Filter logic ─────────────────────────────────────────────────────────────

function applyFilters(results: typeof ALL_RESULTS, filters: FilterValues) {
  return results.filter(r => {
    if (filters.run_id) {
      const q = (filters.run_id as string).trim().toLowerCase();
      if (q && !r.run_id.toLowerCase().includes(q)) return false;
    }
    const providers = filters.provider as string[] | undefined;
    if (providers?.length && !providers.includes(r.provider)) return false;
    const minScore = filters.min_score as number | undefined;
    if (minScore && r.score_overall < minScore) return false;
    if (filters.clicked_only && !r.clicked) return false;
    return true;
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RankingPage() {
  const [filters, setFilters] = useState<FilterValues>({});
  const [selectedResult, setSelectedResult] = useState<RankingRow | null>(null);
  const [compareA, setCompareA] = useState<RankingRow | null>(null);
  const [compareB, setCompareB] = useState<RankingRow | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const filtered = useMemo(() => applyFilters(ALL_RESULTS, filters).slice(0, 200), [filters]);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleRowClick = useCallback((row: Record<string, unknown>) => {
    const result = row as unknown as RankingRow;
    setSelectedResult(result);
    // Pick for compare
    if (!compareA) { setCompareA(result); return; }
    if (!compareB && result.result_id !== compareA.result_id) {
      setCompareB(result);
    }
  }, [compareA, compareB]);

  const tableData = filtered as unknown as Record<string, unknown>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableCols = RANKING_COLUMNS as unknown as import('@/configs/console/columns').ColumnDef<Record<string, unknown>>[];

  return (
    <div className="p-6 space-y-5 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ranking Debugger</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Inspect score breakdowns, compare results, and validate ranking quality
          </p>
        </div>
        {compareA && compareB && (
          <button
            onClick={() => setShowCompare(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            <ArrowLeftRight size={14} />
            Compare Selected
          </button>
        )}
      </div>

      {/* Current weights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <Info size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-blue-800 mb-1">Active Ranking Weights (v{DEFAULT_RANKING_POLICY.version})</p>
          <div className="flex gap-4 text-xs text-blue-700">
            {Object.entries(DEFAULT_RANKING_POLICY.weights).map(([k, v]) => (
              <span key={k} className="font-mono">{k.replace('w_', '')}: {v.toFixed(2)}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Compare selection indicator */}
      {(compareA || compareB) && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs">
          <span className="text-gray-500 font-medium">Compare queue:</span>
          {compareA && (
            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
              A: {compareA.title.slice(0, 30)}…
              <button onClick={() => { setCompareA(null); setCompareB(null); }} className="ml-1 text-blue-400 hover:text-blue-700">✕</button>
            </span>
          )}
          {compareB && (
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">
              B: {compareB.title.slice(0, 30)}…
              <button onClick={() => setCompareB(null)} className="ml-1 text-emerald-400 hover:text-emerald-700">✕</button>
            </span>
          )}
          {compareA && !compareB && (
            <span className="text-gray-400 italic">Click another row to select B</span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
        <FiltersPanel
          filters={RANKING_FILTERS}
          values={filters}
          onChange={handleFilterChange}
          onReset={() => setFilters({})}
        />
      </div>

      {/* Table + Score panel */}
      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          <DataTable
            data={tableData}
            columns={tableCols}
            rowKey="result_id"
            onRowClick={handleRowClick}
            selectedRowKey={selectedResult?.result_id ?? null}
            emptyMessage="No results match filters"
            maxHeight="calc(100vh - 340px)"
          />
          <p className="text-xs text-gray-400 text-right mt-2">
            Showing top 200 results. Use filters to narrow down.
          </p>
        </div>

        {/* Score breakdown sidebar */}
        {selectedResult && (
          <div className="w-72 flex-shrink-0 bg-white border border-gray-200 rounded-lg p-4 space-y-4 self-start sticky top-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={14} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">Score Breakdown</h3>
              </div>
              <button onClick={() => setSelectedResult(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">Rank #{selectedResult.rank}</p>
              <p className="text-sm font-semibold text-gray-800 leading-tight">{selectedResult.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{selectedResult.provider}</p>
            </div>

            <ScoreBreakdown result={selectedResult} />

            {selectedResult.explanation.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Why ranked here</p>
                <ul className="space-y-1">
                  {selectedResult.explanation.map((e, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compare Drawer */}
      {showCompare && compareA && compareB && (
        <CompareDrawer
          a={compareA}
          b={compareB}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
