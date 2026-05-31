'use client';

import { OptimizationResult } from '../../lib/mockData';

interface OptimizationSummaryProps {
  result: OptimizationResult;
  showCount: number;
}

export default function OptimizationSummary({ result, showCount }: OptimizationSummaryProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-900/50 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 9l4 4 8-8"
              stroke="#4ade80"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold">
            Curate optimized your {showCount} show{showCount !== 1 ? 's' : ''} into{' '}
            <span className="text-emerald-400">
              {result.requiredServices.length} service
              {result.requiredServices.length !== 1 ? 's' : ''}
            </span>
          </p>
          {result.monthlySavings > 0 && (
            <p className="text-zinc-400 text-sm mt-0.5">
              Saving ${result.monthlySavings.toFixed(2)}/month vs. your pre-optimization baseline
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
