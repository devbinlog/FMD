'use client';

import React from 'react';
import { CheckCircle2, XCircle, Circle, Loader2, Clock } from 'lucide-react';
import type { JobStep, MockSearchRun } from '@/lib/mock/generators';

function StepIcon({ status }: { status: JobStep['status'] }) {
  switch (status) {
    case 'done':    return <CheckCircle2 size={18} className="text-emerald-500" />;
    case 'failed':  return <XCircle size={18} className="text-red-500" />;
    case 'running': return <Loader2 size={18} className="text-blue-500 animate-spin" />;
    default:        return <Circle size={18} className="text-gray-300" />;
  }
}

const STATUS_BAR: Record<JobStep['status'], string> = {
  done:    'bg-emerald-400',
  failed:  'bg-red-400',
  running: 'bg-blue-400 animate-pulse',
  pending: 'bg-gray-200',
};

interface JobTimelineProps {
  run: MockSearchRun;
}

export function JobTimeline({ run }: JobTimelineProps) {
  const steps = run.job_steps;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Job Timeline</h4>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-gray-400" />
          <span className="text-xs text-gray-500">
            {run.duration_ms !== null
              ? run.duration_ms < 1000 ? `${run.duration_ms}ms` : `${(run.duration_ms / 1000).toFixed(2)}s`
              : '—'}
          </span>
        </div>
      </div>

      {/* Steps */}
      {steps.map((step, i) => (
        <div key={step.step} className="flex gap-3">
          {/* Icon + connector line */}
          <div className="flex flex-col items-center">
            <StepIcon status={step.status} />
            {i < steps.length - 1 && (
              <div className={`w-0.5 flex-1 mt-1 rounded-full ${STATUS_BAR[step.status]}`} style={{ minHeight: 16 }} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-3">
            <div className="flex items-center justify-between">
              <span className={[
                'text-sm font-medium',
                step.status === 'done' ? 'text-gray-800' :
                step.status === 'failed' ? 'text-red-700' :
                step.status === 'running' ? 'text-blue-700' :
                'text-gray-400',
              ].join(' ')}>
                {step.step}. {step.label}
              </span>
              {step.duration_ms !== undefined && (
                <span className="text-xs text-gray-400 tabular-nums">
                  {step.duration_ms < 1000 ? `${step.duration_ms}ms` : `${(step.duration_ms / 1000).toFixed(1)}s`}
                </span>
              )}
            </div>

            {step.started_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(step.started_at).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                })}
              </p>
            )}

            {step.detail && (
              <p className="text-xs text-red-600 mt-1 font-mono bg-red-50 px-2 py-1 rounded">
                {step.detail}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Error block */}
      {run.error_code && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">{run.error_code}</p>
              {run.error_message && (
                <p className="text-xs text-red-600 mt-0.5">{run.error_message}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
