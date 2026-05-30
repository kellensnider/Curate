'use client';

import { motion } from 'framer-motion';

export type PipelineStage = 'idle' | 'loading' | 'done' | 'error';

export interface PipelineStep {
  label: string;
  status: PipelineStage;
}

interface PipelineProgressProps {
  steps: PipelineStep[];
}

const statusColor: Record<PipelineStage, string> = {
  idle: 'border-zinc-700 text-zinc-600',
  loading: 'border-blue-500 text-blue-400',
  done: 'border-emerald-500 text-emerald-400',
  error: 'border-red-500 text-red-400',
};

const statusBg: Record<PipelineStage, string> = {
  idle: 'bg-zinc-900',
  loading: 'bg-blue-950/40',
  done: 'bg-emerald-950/40',
  error: 'bg-red-950/40',
};

export default function PipelineProgress({ steps }: PipelineProgressProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 min-w-0">
          <div
            className={`flex-1 border rounded-xl px-3 py-2 text-xs font-medium transition-all ${statusColor[step.status]} ${statusBg[step.status]}`}
          >
            <div className="flex items-center gap-1.5">
              {step.status === 'loading' && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full shrink-0"
                />
              )}
              {step.status === 'done' && (
                <svg className="shrink-0" width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l2.5 2.5L9 1" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {step.status === 'error' && (
                <span className="shrink-0 text-red-400 text-xs leading-none">✕</span>
              )}
              <span className="truncate">{step.label}</span>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-4 h-px shrink-0 transition-colors ${
                step.status === 'done' ? 'bg-emerald-700' : 'bg-zinc-800'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
