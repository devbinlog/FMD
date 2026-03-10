'use client';

/**
 * Configuration-driven DataTable
 * Renders columns purely from ColumnDef config — no per-page component changes needed.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Settings2 } from 'lucide-react';
import type { ColumnDef } from '@/configs/console/columns';

type SortDir = 'asc' | 'desc' | null;

interface SortState {
  key: string;
  dir: SortDir;
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: keyof T;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | null;
  loading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
  maxHeight?: string;
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

const BADGE_CLASSES: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  error:   'bg-red-50 text-red-700 ring-1 ring-red-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  info:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  neutral: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function CellValue<T extends Record<string, unknown>>({
  col,
  value,
  row,
}: {
  col: ColumnDef<T>;
  value: unknown;
  row: T;
}) {
  const display = col.format ? col.format(value, row) : value;

  switch (col.type) {
    case 'date':
      return (
        <span className="text-gray-500 tabular-nums text-xs whitespace-nowrap">
          {typeof value === 'string' ? formatDate(value) : '—'}
        </span>
      );

    case 'duration':
      return (
        <span className="tabular-nums text-xs font-mono text-gray-700">
          {formatDuration(value as number)}
        </span>
      );

    case 'badge': {
      const variant = col.badgeVariant?.(value) ?? 'neutral';
      const label = display !== null && display !== undefined ? String(display) : '—';
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BADGE_CLASSES[variant]}`}>
          {label}
        </span>
      );
    }

    case 'score': {
      const num = Number(value);
      const displayStr = display !== null && display !== undefined ? String(display) : '—';
      const pct = Math.min(Math.max(num, 0), 1) * 100;
      const barColor = pct > 70 ? 'bg-emerald-400' : pct > 40 ? 'bg-amber-400' : 'bg-red-400';
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="tabular-nums text-xs text-gray-700 font-mono">{displayStr}</span>
        </div>
      );
    }

    case 'tags': {
      const tags = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((t, i) => (
            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
              {String(t)}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-gray-400">+{tags.length - 3}</span>
          )}
        </div>
      );
    }

    case 'color_dot': {
      const hex = typeof value === 'string' ? value : null;
      return hex ? (
        <div className="flex items-center justify-center">
          <div
            className="w-4 h-4 rounded-full border border-gray-200"
            style={{ backgroundColor: hex }}
            title={hex}
          />
        </div>
      ) : <span className="text-gray-300">—</span>;
    }

    case 'number':
      return (
        <span className="tabular-nums text-sm text-gray-700">
          {value !== null && value !== undefined ? String(display ?? value) : '—'}
        </span>
      );

    default:
      return (
        <span className="text-sm text-gray-700 truncate">
          {display !== null && display !== undefined ? String(display) : '—'}
        </span>
      );
  }
}

// ─── Column visibility toggle ─────────────────────────────────────────────────

function ColumnToggle<T extends Record<string, unknown>>({
  columns,
  visible,
  onToggle,
}: {
  columns: ColumnDef<T>[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hideable = columns.filter(c => c.hideable !== false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Settings2 size={13} />
        Columns
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            {hideable.map(col => (
              <label key={String(col.key)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={visible.has(String(col.key))}
                  onChange={() => onToggle(String(col.key))}
                  className="rounded border-gray-300"
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main DataTable ───────────────────────────────────────────────────────────

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowKey,
  onRowClick,
  selectedRowKey,
  loading = false,
  emptyMessage = 'No data',
  stickyHeader = true,
  maxHeight = 'calc(100vh - 280px)',
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: '', dir: null });
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(columns.filter(c => c.defaultVisible !== false).map(c => String(c.key)))
  );

  const toggleSort = useCallback((key: string) => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return { key: '', dir: null };
    });
  }, []);

  const toggleCol = useCallback((key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const visibleColumns = useMemo(
    () => columns.filter(c => visibleCols.has(String(c.key))),
    [columns, visibleCols]
  );

  const sortedData = useMemo(() => {
    if (!sort.key || !sort.dir) return data;
    return [...data].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      let cmp = 0;
      if (av === null || av === undefined) cmp = 1;
      else if (bv === null || bv === undefined) cmp = -1;
      else if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv);
      else cmp = (av as number) > (bv as number) ? 1 : -1;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [data, sort]);

  return (
    <div className="flex flex-col gap-2">
      {/* Column visibility toggle */}
      <div className="flex justify-end">
        <ColumnToggle columns={columns} visible={visibleCols} onToggle={toggleCol} />
      </div>

      {/* Table scroll container */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto bg-white"
        style={{ maxHeight }}
      >
        <table className="w-full text-left border-collapse">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-gray-50' : 'bg-gray-50'}>
            <tr>
              {visibleColumns.map(col => (
                <th
                  key={String(col.key)}
                  className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap select-none"
                  style={{
                    width: col.width,
                    minWidth: col.minWidth ?? col.width,
                    textAlign: col.align ?? 'left',
                  }}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(String(col.key))}
                      className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
                      title={col.tooltip}
                    >
                      {col.label}
                      {sort.key === String(col.key) ? (
                        sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      ) : (
                        <ChevronsUpDown size={12} className="text-gray-300" />
                      )}
                    </button>
                  ) : (
                    <span title={col.tooltip}>{col.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {visibleColumns.map(col => (
                    <td key={String(col.key)} className="px-3 py-2.5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: col.width ? col.width * 0.7 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-3 py-12 text-center text-sm text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map(row => {
                const key = String(row[rowKey]);
                const isSelected = selectedRowKey === key;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={[
                      'border-b border-gray-100 transition-colors',
                      onRowClick ? 'cursor-pointer' : '',
                      isSelected ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {visibleColumns.map(col => (
                      <td
                        key={String(col.key)}
                        className="px-3 py-2"
                        style={{ textAlign: col.align ?? 'left' }}
                      >
                        <CellValue col={col} value={row[col.key as string]} row={row} />
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      {!loading && (
        <p className="text-xs text-gray-400 text-right">
          {sortedData.length.toLocaleString()} row{sortedData.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
