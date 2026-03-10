'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';

import { DataTable } from '@/components/admin/DataTable';
import { FiltersPanel } from '@/components/admin/FiltersPanel';
import { JobTimeline } from '@/components/admin/JobTimeline';
import { Pagination } from '@/components/admin/Pagination';

import { JOBS_COLUMNS, type JobRow } from '@/configs/console/columns';
import { JOBS_FILTERS } from '@/configs/console/filters';
import type { FilterValues } from '@/configs/console/filters';

import { generateSearchRuns, type MockSearchRun } from '@/lib/mock/generators';

const ALL_RUNS = generateSearchRuns(1000);

// Flatten runs → job rows
const ALL_JOBS: (JobRow & { _run: MockSearchRun })[] = ALL_RUNS.map(r => ({
  job_id: r.job_id,
  run_id: r.run_id,
  created_at: r.created_at,
  finished_at: r.finished_at,
  status: r.job_status,
  progress: r.job_status === 'SUCCEEDED' ? 100 :
            r.job_status === 'RUNNING'   ? 70  :
            r.job_status === 'QUEUED'    ? 0   : 40,
  duration_ms: r.duration_ms,
  error_code: r.error_code,
  design_id: r.design_id,
  category: r.category,
  input_mode: r.input_mode,
  _run: r,
}));

// ─── KPI Summary Cards ────────────────────────────────────────────────────────

function JobKPI({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`flex-1 min-w-[140px] border rounded-lg px-4 py-3 ${color}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}

// ─── State Machine Visualization ──────────────────────────────────────────────

const STATES: Array<{ key: string; label: string; color: string }> = [
  { key: 'QUEUED',    label: 'Queued',    color: 'bg-gray-200 text-gray-600' },
  { key: 'RUNNING',   label: 'Running',   color: 'bg-blue-100 text-blue-700' },
  { key: 'SUCCEEDED', label: 'Succeeded', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'FAILED',    label: 'Failed',    color: 'bg-red-100 text-red-700' },
];

function StateMachine() {
  return (
    <div className="flex items-center gap-2 text-xs bg-white border border-gray-200 rounded-lg px-4 py-2 flex-wrap">
      <span className="text-gray-500 font-medium mr-1">Job State Machine:</span>
      {STATES.map((s, i) => (
        <React.Fragment key={s.key}>
          <span className={`px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
          {i < STATES.length - 2 && <span className="text-gray-400">→</span>}
          {i === STATES.length - 2 && (
            <>
              <span className="text-gray-400">→</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">→ (on error)</span>
            </>
          )}
        </React.Fragment>
      ))}
      <div className="ml-4 flex items-center gap-1 text-gray-400">
        <span>Progress: 0% → 40% → 70% → 100%</span>
      </div>
    </div>
  );
}

// ─── Filter + page logic ──────────────────────────────────────────────────────

function applyFilters(jobs: typeof ALL_JOBS, filters: FilterValues) {
  return jobs.filter(job => {
    if (filters.dateRange) {
      const dr = filters.dateRange as { from: string; to: string };
      if (dr.from && job.created_at < dr.from) return false;
      if (dr.to && job.created_at > dr.to + 'T23:59:59Z') return false;
    }
    const statuses = filters.status as string[] | undefined;
    if (statuses?.length && !statuses.includes(job.status)) return false;
    const cats = filters.category as string[] | undefined;
    if (cats?.length && !cats.includes(job.category)) return false;
    if (filters.error_code && job.error_code !== filters.error_code) return false;
    return true;
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [filters, setFilters] = useState<FilterValues>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedJob, setSelectedJob] = useState<(typeof ALL_JOBS)[0] | null>(null);
  const [retryLog, setRetryLog] = useState<string[]>([]);

  const filtered = useMemo(() => applyFilters(ALL_JOBS, filters), [filters]);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const succeeded = ALL_JOBS.filter(j => j.status === 'SUCCEEDED').length;
  const failed = ALL_JOBS.filter(j => j.status === 'FAILED').length;
  const running = ALL_JOBS.filter(j => j.status === 'RUNNING').length;
  const avgDuration = Math.round(
    ALL_JOBS.filter(j => j.duration_ms !== null)
      .reduce((s, j) => s + j.duration_ms!, 0) /
    ALL_JOBS.filter(j => j.duration_ms !== null).length
  );

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleRetry = useCallback((job: typeof ALL_JOBS[0]) => {
    const msg = `[${new Date().toLocaleTimeString()}] Retried job ${job.job_id.slice(0, 8)}`;
    setRetryLog(prev => [msg, ...prev].slice(0, 5));
    setSelectedJob(null);
  }, []);

  const tableData = paginated as unknown as Record<string, unknown>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableCols = JOBS_COLUMNS as unknown as import('@/configs/console/columns').ColumnDef<Record<string, unknown>>[];

  return (
    <div className="p-6 space-y-5 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Job Observability</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Monitor job lifecycle, failures, and processing times
        </p>
      </div>

      {/* KPIs */}
      <div className="flex gap-3 flex-wrap">
        <JobKPI label="Total Jobs" value={ALL_JOBS.length.toLocaleString()}
          icon={<Activity size={15} className="text-gray-400" />} color="bg-white border-gray-200" />
        <JobKPI label="Succeeded" value={succeeded.toLocaleString()}
          icon={<CheckCircle2 size={15} className="text-emerald-500" />} color="bg-emerald-50 border-emerald-200" />
        <JobKPI label="Failed" value={failed.toLocaleString()}
          icon={<XCircle size={15} className="text-red-500" />} color="bg-red-50 border-red-200" />
        <JobKPI label="Running" value={running.toLocaleString()}
          icon={<RefreshCw size={15} className="text-blue-500" />} color="bg-blue-50 border-blue-200" />
        <JobKPI label="Avg Duration" value={`${(avgDuration / 1000).toFixed(1)}s`}
          icon={<Clock size={15} className="text-amber-500" />} color="bg-amber-50 border-amber-200" />
      </div>

      {/* State machine legend */}
      <StateMachine />

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
        <FiltersPanel
          filters={JOBS_FILTERS}
          values={filters}
          onChange={handleFilterChange}
          onReset={() => { setFilters({}); setPage(1); }}
        />
      </div>

      {/* Table + Drawer layout */}
      <div className="flex gap-5">
        {/* Main table */}
        <div className="flex-1 min-w-0 space-y-3">
          <DataTable
            data={tableData}
            columns={tableCols}
            rowKey="job_id"
            onRowClick={row => setSelectedJob(row as unknown as typeof ALL_JOBS[0])}
            selectedRowKey={selectedJob?.job_id ?? null}
            emptyMessage="No jobs match filters"
          />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={size => { setPageSize(size); setPage(1); }}
          />
        </div>

        {/* Inline detail panel */}
        {selectedJob && (
          <div className="w-80 flex-shrink-0 bg-white border border-gray-200 rounded-lg p-4 space-y-4 self-start sticky top-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Job Detail</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400">Job ID</p>
                <p className="text-xs font-mono text-gray-700 truncate">{selectedJob.job_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Design ID</p>
                <p className="text-xs font-mono text-gray-700 truncate">{selectedJob.design_id}</p>
              </div>
            </div>

            <JobTimeline run={selectedJob._run} />

            {selectedJob.status === 'FAILED' && (
              <button
                onClick={() => handleRetry(selectedJob)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <RefreshCw size={13} />
                Retry Job
              </button>
            )}
          </div>
        )}
      </div>

      {/* Retry log */}
      {retryLog.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Retry Log</p>
          {retryLog.map((log, i) => (
            <p key={i} className="text-xs text-gray-600 font-mono">{log}</p>
          ))}
        </div>
      )}
    </div>
  );
}
