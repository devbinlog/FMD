'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Download } from 'lucide-react';

import { DataTable } from '@/components/admin/DataTable';
import { FiltersPanel } from '@/components/admin/FiltersPanel';
import { KPIBar } from '@/components/admin/KPIBar';
import { RunDetailDrawer } from '@/components/admin/RunDetailDrawer';
import { Pagination } from '@/components/admin/Pagination';

import { RUNS_COLUMNS } from '@/configs/console/columns';
import { RUNS_FILTERS } from '@/configs/console/filters';
import type { FilterValues } from '@/configs/console/filters';

import {
  generateSearchRuns,
  computeKPIs,
  type MockSearchRun,
} from '@/lib/mock/generators';

// ─── Data ─────────────────────────────────────────────────────────────────────

const ALL_RUNS = generateSearchRuns(1000);

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(runs: MockSearchRun[]) {
  const headers = [
    'run_id', 'created_at', 'input_mode', 'category', 'query_summary',
    'job_status', 'duration_ms', 'results_count', 'provider_mix', 'error_code'
  ];
  const rows = runs.map(r => [
    r.run_id, r.created_at, r.input_mode, r.category,
    `"${r.query_summary.replace(/"/g, '""')}"`,
    r.job_status, r.duration_ms ?? '', r.results_count,
    r.provider_mix.join('|'), r.error_code ?? ''
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fmd-runs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Filter logic ─────────────────────────────────────────────────────────────

function applyFilters(runs: MockSearchRun[], filters: FilterValues): MockSearchRun[] {
  return runs.filter(run => {
    // Date range
    if (filters.dateRange) {
      const dr = filters.dateRange as { from: string; to: string };
      if (dr.from && run.created_at < dr.from) return false;
      if (dr.to && run.created_at > dr.to + 'T23:59:59Z') return false;
    }
    // Status
    const statuses = filters.job_status as string[] | undefined;
    if (statuses?.length && !statuses.includes(run.job_status)) return false;
    // Input mode
    const modes = filters.input_mode as string[] | undefined;
    if (modes?.length && !modes.includes(run.input_mode)) return false;
    // Category
    const cats = filters.category as string[] | undefined;
    if (cats?.length && !cats.includes(run.category)) return false;
    // Provider
    const providers = filters.provider as string[] | undefined;
    if (providers?.length && !providers.some(p => run.provider_mix.includes(p))) return false;
    // Error code
    if (filters.error_code && run.error_code !== filters.error_code) return false;
    // Query text
    const query = (filters.query as string | undefined)?.toLowerCase().trim();
    if (query && !run.query_summary.toLowerCase().includes(query)) return false;
    // Duration range
    const dur = filters.duration as [number, number] | undefined;
    if (dur) {
      if (run.duration_ms === null) return false;
      if (run.duration_ms < dur[0] || run.duration_ms > dur[1]) return false;
    }
    return true;
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterValues = {};
const PAGE_SIZE = 50;

export default function RunsPage() {
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selectedRun, setSelectedRun] = useState<MockSearchRun | null>(null);
  const [retryToast, setRetryToast] = useState<string | null>(null);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleFilterReset = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  const filtered = useMemo(() => applyFilters(ALL_RUNS, filters), [filters]);
  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const handleRetry = useCallback((run: MockSearchRun) => {
    setRetryToast(`Re-queued job for run ${run.run_id.slice(0, 8)}…`);
    setTimeout(() => setRetryToast(null), 3000);
    setSelectedRun(null);
  }, []);

  // Cast to generic record type for DataTable
  const tableData = paginated as unknown as Record<string, unknown>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableCols = RUNS_COLUMNS as unknown as import('@/configs/console/columns').ColumnDef<Record<string, unknown>>[];

  return (
    <div className="p-6 space-y-5 min-h-screen">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Search Runs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse, filter, and inspect all design search runs
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Download size={14} />
          Export CSV ({filtered.length.toLocaleString()})
        </button>
      </div>

      {/* KPI Bar */}
      <KPIBar stats={kpis} />

      {/* Filters (config-driven) */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
        <FiltersPanel
          filters={RUNS_FILTERS}
          values={filters}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
        />
      </div>

      {/* Table (config-driven) */}
      <div className="space-y-3">
        <DataTable
          data={tableData}
          columns={tableCols}
          rowKey="run_id"
          onRowClick={row => setSelectedRun(row as unknown as MockSearchRun)}
          selectedRowKey={selectedRun?.run_id ?? null}
          emptyMessage="No runs match the current filters"
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={size => { setPageSize(size); setPage(1); }}
        />
      </div>

      {/* Detail Drawer */}
      <RunDetailDrawer
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
        onRetry={handleRetry}
      />

      {/* Retry toast */}
      {retryToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50 animate-fade-in">
          {retryToast}
        </div>
      )}
    </div>
  );
}
