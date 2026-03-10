'use client';

import React, { useState, useCallback } from 'react';
import { Settings, Flag, History, AlertTriangle, Check, RefreshCw } from 'lucide-react';

import {
  DEFAULT_RANKING_POLICY,
  validateWeights,
  validatePenalties,
  type RankingPolicyConfig,
  type RankingWeights,
} from '@/configs/console/policies';

import {
  generateProviders,
  generateConfigChanges,
  generateFeatureFlags,
  type MockProvider,
  type MockConfigChange,
  type MockFeatureFlag,
} from '@/lib/mock/generators';

// ─── Providers Data ───────────────────────────────────────────────────────────
const INITIAL_PROVIDERS = generateProviders();
const CONFIG_HISTORY = generateConfigChanges();
const FEATURE_FLAGS = generateFeatureFlags();

// ─── Weight Slider ────────────────────────────────────────────────────────────

function WeightSlider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const pct = Math.round(value * 100);
  const barColor = pct > 35 ? 'accent-blue-600' : 'accent-gray-500';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value.toFixed(2)}
            min={0}
            max={1}
            step={0.01}
            onChange={e => onChange(Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))}
            disabled={disabled}
            className="w-16 text-xs text-right border border-gray-200 rounded px-2 py-1 font-mono tabular-nums disabled:opacity-50"
          />
          <span className="text-xs text-gray-400 w-10 text-right tabular-nums">{pct}%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className={`w-full h-2 rounded-full appearance-none bg-gray-200 cursor-pointer disabled:cursor-not-allowed ${barColor}`}
      />
    </div>
  );
}

// ─── Provider Toggle Row ──────────────────────────────────────────────────────

function ProviderRow({
  provider,
  onToggle,
}: {
  provider: MockProvider;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{provider.name}</p>
        <p className="text-xs text-gray-400 truncate">{provider.base_url}</p>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
        <span title="Avg latency">{provider.avg_latency_ms}ms</span>
        <span title="Success rate" className={provider.success_rate < 0.9 ? 'text-amber-600' : 'text-emerald-600'}>
          {(provider.success_rate * 100).toFixed(0)}%
        </span>
        <span title="Avg results">~{provider.result_count_avg} results</span>
      </div>
      <button
        role="switch"
        aria-checked={provider.enabled}
        onClick={() => onToggle(provider.id, !provider.enabled)}
        className={[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
          provider.enabled ? 'bg-blue-600' : 'bg-gray-200',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            provider.enabled ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

// ─── Change History Row ───────────────────────────────────────────────────────

function ChangeRow({ change }: { change: MockConfigChange }) {
  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-gray-800 font-mono">{change.config_key}</p>
          <time className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
            {new Date(change.changed_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </time>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">by {change.changed_by}</p>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{change.reason}</p>
        <div className="flex gap-2 mt-1.5 font-mono text-xs">
          <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded line-through">
            {JSON.stringify(change.old_value)}
          </span>
          <span className="text-gray-400">→</span>
          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
            {JSON.stringify(change.new_value)}
          </span>
        </div>
        {change.feature_flag && (
          <span className="mt-1 inline-block text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100 font-mono">
            flag: {change.feature_flag}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Feature Flag Row ─────────────────────────────────────────────────────────

function FlagRow({
  flag,
  onToggle,
}: {
  flag: MockFeatureFlag;
  onToggle: (key: string, enabled: boolean) => void;
}) {
  const expired = flag.expires_at && new Date(flag.expires_at) < new Date();
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 font-mono">{flag.key}</p>
          {expired && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
              Expired
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{flag.description}</p>
        <div className="flex gap-3 mt-1 text-xs text-gray-400">
          <span>Owner: {flag.owner}</span>
          <span>Variant: {flag.variant_pct}%</span>
          {flag.expires_at && <span>Expires: {new Date(flag.expires_at).toLocaleDateString()}</span>}
        </div>
      </div>
      <button
        role="switch"
        aria-checked={flag.enabled}
        onClick={() => onToggle(flag.key, !flag.enabled)}
        className={[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-1',
          flag.enabled ? 'bg-purple-600' : 'bg-gray-200',
        ].join(' ')}
      >
        <span className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          flag.enabled ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = 'weights' | 'providers' | 'flags' | 'history';

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('weights');
  const [config, setConfig] = useState<RankingPolicyConfig>({ ...DEFAULT_RANKING_POLICY });
  const [providers, setProviders] = useState<MockProvider[]>(INITIAL_PROVIDERS);
  const [flags, setFlags] = useState<MockFeatureFlag[]>(FEATURE_FLAGS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);

  const updateWeight = useCallback((key: keyof RankingWeights, value: number) => {
    setConfig(prev => ({
      ...prev,
      weights: { ...prev.weights, [key]: value },
    }));
    setValidationError(null);
    setSaveStatus('idle');
  }, []);

  const handleSaveWeights = useCallback(() => {
    const err = validateWeights(config.weights);
    if (err) { setValidationError(err); return; }
    const errP = validatePenalties(config.penalties);
    if (errP) { setValidationError(errP); return; }

    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 800);
    setValidationError(null);
  }, [config]);

  const handleResetWeights = useCallback(() => {
    setConfig({ ...DEFAULT_RANKING_POLICY });
    setValidationError(null);
    setSaveStatus('idle');
  }, []);

  const toggleProvider = useCallback((id: string, enabled: boolean) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, enabled } : p));
  }, []);

  const toggleFlag = useCallback((key: string, enabled: boolean) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled } : f));
  }, []);

  const weightSum = Object.values(config.weights).reduce((a, b) => a + b, 0);
  const weightError = Math.abs(weightSum - 1) > 0.001;

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'weights',   label: 'Ranking Weights',  icon: <Settings size={14} /> },
    { key: 'providers', label: 'Providers',         icon: <RefreshCw size={14} /> },
    { key: 'flags',     label: 'Feature Flags',     icon: <Flag size={14} /> },
    { key: 'history',   label: 'Change History',    icon: <History size={14} /> },
  ];

  return (
    <div className="p-6 space-y-5 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Config Studio</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage ranking weights, provider policies, and feature flags
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Ranking Weights Tab ─────────────────────────────────────────────── */}
      {activeTab === 'weights' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Weight Configuration</h2>
                <p className="text-xs text-gray-500 mt-0.5">Version {config.version} — {config.description}</p>
              </div>
              <div className={[
                'px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums',
                weightError ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
              ].join(' ')}>
                Σ = {weightSum.toFixed(3)}
              </div>
            </div>

            <div className="space-y-5">
              <WeightSlider label="Keyword Score (w_keyword)" value={config.weights.w_keyword}
                onChange={v => updateWeight('w_keyword', v)} />
              <WeightSlider label="Color Score (w_color)" value={config.weights.w_color}
                onChange={v => updateWeight('w_color', v)} />
              <WeightSlider label="Embedding Score (w_embedding)" value={config.weights.w_embedding}
                onChange={v => updateWeight('w_embedding', v)} />
              <WeightSlider label="Meta Score (w_meta)" value={config.weights.w_meta}
                onChange={v => updateWeight('w_meta', v)} />
            </div>

            {(validationError || weightError) && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                {validationError || `Weights must sum to 1.0 (current: ${weightSum.toFixed(3)})`}
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={handleSaveWeights}
                disabled={saveStatus === 'saving' || weightError}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {saveStatus === 'saving' ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : saveStatus === 'saved' ? (
                  <Check size={13} />
                ) : (
                  <Settings size={13} />
                )}
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save Config'}
              </button>
              <button
                onClick={handleResetWeights}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </div>

          {/* Penalty config */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Penalty Configuration</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: 'No Image', key: 'no_image', value: config.penalties.no_image },
                { label: 'Duplicate URL', key: 'duplicate_url', value: config.penalties.duplicate_url },
                { label: 'Negative Keyword', key: 'negative_keyword', value: config.penalties.negative_keyword },
              ].map(({ label, key, value }) => (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-xl font-bold text-gray-800 tabular-nums">
                    -{(value * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Penalties are applied multiplicatively to the final score. Edit in
              <code className="mx-1 px-1 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-xs">
                configs/console/policies.ts
              </code>
            </p>
          </div>
        </div>
      )}

      {/* ── Providers Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'providers' && (
        <div className="max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Provider Registry</h2>
            <p className="text-xs text-gray-500 mb-4">Toggle providers on/off. Changes take effect on next search run.</p>
            {providers.map(p => (
              <ProviderRow key={p.id} provider={p} onToggle={toggleProvider} />
            ))}
          </div>
        </div>
      )}

      {/* ── Feature Flags Tab ───────────────────────────────────────────────── */}
      {activeTab === 'flags' && (
        <div className="max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Feature Flags</h2>
            <p className="text-xs text-gray-500 mb-4">Control experiment rollouts and canary deployments.</p>
            {flags.map(f => (
              <FlagRow key={f.key} flag={f} onToggle={toggleFlag} />
            ))}
          </div>
        </div>
      )}

      {/* ── Change History Tab ──────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Change History</h2>
            <p className="text-xs text-gray-500 mb-4">Audit log of all configuration changes.</p>
            {CONFIG_HISTORY.map(c => (
              <ChangeRow key={c.change_id} change={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
