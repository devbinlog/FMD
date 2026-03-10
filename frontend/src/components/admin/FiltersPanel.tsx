'use client';

/**
 * Configuration-driven FiltersPanel
 * Renders filter inputs from FilterDef config array.
 */

import React, { useState, useCallback } from 'react';
import { X, Filter } from 'lucide-react';
import type { FilterDef, FilterValues } from '@/configs/console/filters';

interface FiltersPanelProps {
  filters: FilterDef[];
  values: FilterValues;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
}

function MultiSelect({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ?? [];

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter(v => v !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div className="relative" style={{ minWidth: filter.width ?? 160 }}>
      <button
        onClick={() => setOpen(v => !v)}
        className={[
          'w-full text-left px-2.5 py-1.5 text-xs border rounded-md flex items-center justify-between gap-1 transition-colors',
          selected.length > 0
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
        ].join(' ')}
      >
        <span className="truncate">
          {selected.length === 0
            ? `${filter.label}…`
            : `${filter.label}: ${selected.length} selected`}
        </span>
        {selected.length > 0 ? (
          <X
            size={12}
            className="flex-shrink-0 cursor-pointer"
            onClick={e => { e.stopPropagation(); onChange([]); }}
          />
        ) : (
          <span className="text-gray-400">▾</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-full">
            {filter.options?.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="rounded border-gray-300"
                />
                <span className="flex-1">{opt.label}</span>
                {opt.count !== undefined && (
                  <span className="text-xs text-gray-400">{opt.count}</span>
                )}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SingleSelect({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="relative" style={{ minWidth: filter.width ?? 140 }}>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className={[
          'w-full px-2.5 py-1.5 text-xs border rounded-md appearance-none cursor-pointer transition-colors',
          value ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600',
        ].join(' ')}
      >
        <option value="">{filter.label}…</option>
        {filter.options?.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function DateRangePicker({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef;
  value: { from: string; to: string } | null;
  onChange: (v: { from: string; to: string } | null) => void;
}) {
  return (
    <div className="flex items-center gap-1" style={{ minWidth: filter.width ?? 220 }}>
      <input
        type="date"
        value={value?.from ?? ''}
        onChange={e => onChange({ from: e.target.value, to: value?.to ?? '' })}
        className="px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white text-gray-700 cursor-pointer"
      />
      <span className="text-gray-400 text-xs">–</span>
      <input
        type="date"
        value={value?.to ?? ''}
        onChange={e => onChange({ from: value?.from ?? '', to: e.target.value })}
        className="px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white text-gray-700 cursor-pointer"
      />
      {value && (
        <button onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600">
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function TextFilter({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative" style={{ minWidth: filter.width ?? 180 }}>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={filter.placeholder ?? `${filter.label}…`}
        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function ToggleFilter({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
          value ? 'bg-blue-500' : 'bg-gray-200',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
      <span className="text-xs text-gray-600">{filter.label}</span>
    </label>
  );
}

export function FiltersPanel({ filters, values, onChange, onReset }: FiltersPanelProps) {
  const activeCount = Object.values(values).filter(v => {
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === 'boolean' && v === false) return false;
    return true;
  }).length;

  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mr-1">
        <Filter size={13} />
        Filters
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-500 text-white rounded-full text-[10px]">
            {activeCount}
          </span>
        )}
      </div>

      {filters.map(filter => {
        const val = values[filter.key];
        switch (filter.type) {
          case 'multiselect':
            return (
              <MultiSelect
                key={filter.key}
                filter={filter}
                value={(val as string[]) ?? []}
                onChange={v => onChange(filter.key, v)}
              />
            );
          case 'select':
            return (
              <SingleSelect
                key={filter.key}
                filter={filter}
                value={val as string | null}
                onChange={v => onChange(filter.key, v)}
              />
            );
          case 'daterange':
            return (
              <DateRangePicker
                key={filter.key}
                filter={filter}
                value={val as { from: string; to: string } | null}
                onChange={v => onChange(filter.key, v)}
              />
            );
          case 'text':
            return (
              <TextFilter
                key={filter.key}
                filter={filter}
                value={(val as string) ?? ''}
                onChange={v => onChange(filter.key, v)}
              />
            );
          case 'toggle':
            return (
              <ToggleFilter
                key={filter.key}
                filter={filter}
                value={(val as boolean) ?? false}
                onChange={v => onChange(filter.key, v)}
              />
            );
          default:
            return null;
        }
      })}

      {activeCount > 0 && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X size={12} />
          Clear all
        </button>
      )}
    </div>
  );
}
