'use client';

import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Activity, MousePointerClick } from 'lucide-react';
import type { KPIStats } from '@/lib/mock/generators';
import { KPI_THRESHOLDS } from '@/configs/console/policies';

interface KPICardProps {
  label: string;
  value: string;
  subtext?: string;
  status?: 'ok' | 'warn' | 'critical' | 'neutral';
  icon: React.ReactNode;
  trend?: 'up' | 'down' | null;
}

function KPICard({ label, value, subtext, status = 'neutral', icon, trend }: KPICardProps) {
  const statusColors = {
    ok:       'border-emerald-200 bg-emerald-50',
    warn:     'border-amber-200 bg-amber-50',
    critical: 'border-red-200 bg-red-50',
    neutral:  'border-gray-200 bg-white',
  };
  const valueColors = {
    ok:       'text-emerald-700',
    warn:     'text-amber-700',
    critical: 'text-red-700',
    neutral:  'text-gray-900',
  };
  const iconColors = {
    ok:       'text-emerald-500',
    warn:     'text-amber-500',
    critical: 'text-red-500',
    neutral:  'text-gray-400',
  };

  return (
    <div className={`flex-1 min-w-[160px] border rounded-lg px-4 py-3 ${statusColors[status]}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className={iconColors[status]}>{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold tabular-nums leading-tight ${valueColors[status]}`}>
          {value}
        </span>
        {trend === 'up' && <TrendingUp size={14} className="text-emerald-500 mb-1" />}
        {trend === 'down' && <TrendingDown size={14} className="text-red-500 mb-1" />}
      </div>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

interface KPIBarProps {
  stats: KPIStats;
  loading?: boolean;
}

export function KPIBar({ stats, loading = false }: KPIBarProps) {
  if (loading) {
    return (
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-4 py-3 animate-pulse bg-gray-50">
            <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-7 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const failStatus =
    stats.fail_rate >= KPI_THRESHOLDS.fail_rate_critical ? 'critical' :
    stats.fail_rate >= KPI_THRESHOLDS.fail_rate_warn ? 'warn' : 'ok';

  const latencyStatus =
    stats.p95_duration_ms >= KPI_THRESHOLDS.p95_latency_critical_ms ? 'critical' :
    stats.p95_duration_ms >= KPI_THRESHOLDS.p95_latency_warn_ms ? 'warn' : 'ok';

  const zeroResultStatus =
    stats.zero_result_rate >= KPI_THRESHOLDS.zero_result_critical ? 'critical' :
    stats.zero_result_rate >= KPI_THRESHOLDS.zero_result_warn ? 'warn' : 'ok';

  const ctrStatus = stats.ctr_at_10 < KPI_THRESHOLDS.ctr_low_warn ? 'warn' : 'ok';

  const formatMs = (ms: number) => ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;

  return (
    <div className="flex gap-3 flex-wrap">
      <KPICard
        label="Total Runs"
        value={stats.total_runs.toLocaleString()}
        icon={<Activity size={16} />}
        status="neutral"
        subtext="all time in view"
      />
      <KPICard
        label="Success Rate"
        value={`${(stats.success_rate * 100).toFixed(1)}%`}
        icon={<TrendingUp size={16} />}
        status={stats.success_rate >= 0.95 ? 'ok' : stats.success_rate >= 0.90 ? 'warn' : 'critical'}
        subtext={`${((1 - stats.success_rate) * 100).toFixed(1)}% failed`}
      />
      <KPICard
        label="Fail Rate"
        value={`${(stats.fail_rate * 100).toFixed(1)}%`}
        icon={<AlertTriangle size={16} />}
        status={failStatus}
        subtext={failStatus === 'ok' ? 'Within threshold' : 'Above threshold'}
      />
      <KPICard
        label="Avg Duration"
        value={formatMs(stats.avg_duration_ms)}
        subtext={`p95: ${formatMs(stats.p95_duration_ms)}`}
        icon={<Clock size={16} />}
        status={latencyStatus}
      />
      <KPICard
        label="CTR@10"
        value={`${(stats.ctr_at_10 * 100).toFixed(1)}%`}
        subtext="at least 1 result clicked"
        icon={<MousePointerClick size={16} />}
        status={ctrStatus}
      />
      <KPICard
        label="Zero-Result Rate"
        value={`${(stats.zero_result_rate * 100).toFixed(1)}%`}
        subtext={`avg ${stats.avg_results_count.toFixed(1)} results/run`}
        icon={<AlertTriangle size={16} />}
        status={zeroResultStatus}
      />
    </div>
  );
}
