'use client';

import React, { useState } from 'react';
import { X, ExternalLink, RefreshCw, Tag, Cpu, Database } from 'lucide-react';
import type { MockSearchRun, MockSearchResult } from '@/lib/mock/generators';
import { JobTimeline } from './JobTimeline';

interface RunDetailDrawerProps {
  run: MockSearchRun | null;
  onClose: () => void;
  onRetry?: (run: MockSearchRun) => void;
}

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  const pct = Math.round(value * 100);
  const contribution = value * weight;
  const barColor = pct > 70 ? 'bg-emerald-400' : pct > 40 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-gray-500 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums text-gray-700 font-mono">{pct}%</span>
      <span className="w-16 text-right tabular-nums text-gray-400">(×{weight.toFixed(2)}={contribution.toFixed(3)})</span>
    </div>
  );
}

function ResultRow({ result, rank }: { result: MockSearchResult; rank: number }) {
  return (
    <div className={[
      'flex items-center gap-3 px-3 py-2 rounded-lg border text-sm',
      result.clicked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-white',
    ].join(' ')}>
      <span className="w-5 text-center text-xs font-bold text-gray-400 flex-shrink-0">#{rank}</span>

      {result.image_url ? (
        <img
          src={result.image_url}
          alt=""
          className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-100"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{result.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{result.provider}</span>
          {result.price !== null && (
            <span className="text-xs text-gray-500">${result.price.toFixed(2)}</span>
          )}
          {result.clicked && (
            <span className="text-xs text-emerald-600 font-medium">● Clicked</span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold text-gray-700 tabular-nums">{result.score_overall.toFixed(3)}</p>
        <p className="text-xs text-gray-400">overall</p>
      </div>

      {result.product_url && (
        <a
          href={result.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-300 hover:text-blue-500 flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

export function RunDetailDrawer({ run, onClose, onRetry }: RunDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'results'>('overview');

  if (!run) return null;

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'timeline' as const, label: 'Job Timeline' },
    { key: 'results' as const, label: `Results (${run.results_count})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-[480px] bg-white border-l border-gray-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Run Detail</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{run.run_id}</p>
          </div>
          <div className="flex items-center gap-2">
            {run.job_status === 'FAILED' && onRetry && (
              <button
                onClick={() => onRetry(run)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Status badge */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={[
              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
              run.job_status === 'SUCCEEDED' ? 'bg-emerald-100 text-emerald-700' :
              run.job_status === 'FAILED'    ? 'bg-red-100 text-red-700' :
              run.job_status === 'RUNNING'   ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600',
            ].join(' ')}>
              {run.job_status}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(run.created_at).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </span>
            {run.duration_ms !== null && (
              <span className="text-xs text-gray-500 tabular-nums">
                {run.duration_ms < 1000 ? `${run.duration_ms}ms` : `${(run.duration_ms / 1000).toFixed(2)}s`}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-5 space-y-5">
              {/* Metadata */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Metadata</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Input Mode', value: run.input_mode },
                    { label: 'Category', value: run.category },
                    { label: 'Results', value: String(run.results_count) },
                    { label: 'Providers', value: run.provider_mix.join(', ') },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Query */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Query</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">
                  {run.query_summary}
                </p>
              </section>

              {/* Keywords */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Tag size={12} /> Keywords
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {run.keywords.map(kw => (
                    <span key={kw} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                      {kw}
                    </span>
                  ))}
                </div>
              </section>

              {/* AI Image */}
              {run.ai_image_url && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Cpu size={12} /> AI Reference Image
                  </h3>
                  <img
                    src={run.ai_image_url}
                    alt="AI generated reference"
                    className="w-full h-40 object-cover rounded-lg bg-gray-100"
                  />
                </section>
              )}

              {/* Score breakdown (top result) */}
              {run.top_results.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Database size={12} /> Top Result Score Breakdown
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">"{run.top_results[0].title}"</p>
                  <div className="space-y-2">
                    <ScoreBar label="Keyword" value={run.top_results[0].score_keyword} weight={0.45} />
                    <ScoreBar label="Color" value={run.top_results[0].score_color} weight={0.20} />
                    <ScoreBar label="Embedding" value={run.top_results[0].score_embedding} weight={0.30} />
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between">
                    <span className="text-xs text-gray-500 font-semibold">Overall Score</span>
                    <span className="text-xs font-bold text-gray-900 tabular-nums">
                      {run.top_results[0].score_overall.toFixed(4)}
                    </span>
                  </div>
                </section>
              )}

              {/* Feature flags */}
              {run.feature_flags.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Feature Flags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {run.feature_flags.map(flag => (
                      <span key={flag} className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded border border-purple-100 font-mono">
                        {flag}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="p-5">
              <JobTimeline run={run} />
            </div>
          )}

          {activeTab === 'results' && (
            <div className="p-5">
              {run.top_results.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">
                  No results for this run
                </div>
              ) : (
                <div className="space-y-2">
                  {run.top_results.map(r => (
                    <ResultRow key={r.result_id} result={r} rank={r.rank} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
