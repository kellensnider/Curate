'use client';

import { useEffect, useRef, useState } from 'react';
import { OptimizationResult, ALL_SERVICES_TOTAL } from '../../lib/mockData';

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

interface CostCalculatorProps {
  result: OptimizationResult;
}

export default function CostCalculator({ result }: CostCalculatorProps) {
  const animatedTotal = useCountUp(result.monthlyTotal);
  const animatedSavings = useCountUp(result.monthlySavings);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">
        Monthly Cost
      </p>

      {/* Main total */}
      <div className="mb-1">
        <span className="text-5xl font-bold text-white tabular-nums">
          ${animatedTotal.toFixed(2)}
        </span>
        <span className="text-zinc-500 text-sm ml-2">/mo</span>
      </div>
      <p className="text-zinc-600 text-sm line-through">
        ${ALL_SERVICES_TOTAL.toFixed(2)}/mo for all 8 services
      </p>

      {/* Savings callout */}
      {result.monthlySavings > 0 && (
        <div className="mt-4 p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-xl">
          <p className="text-emerald-400 font-semibold text-lg">
            Saving ${animatedSavings.toFixed(2)}/mo
          </p>
          <p className="text-emerald-700 text-xs mt-0.5">
            That's ${(result.monthlySavings * 12).toFixed(0)} back per year
          </p>
        </div>
      )}

      {/* Line items */}
      {result.requiredServices.length > 0 && (
        <div className="mt-5 space-y-2.5 border-t border-zinc-800 pt-4">
          {result.requiredServices.map((service) => (
            <div key={service.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: service.brandColor }}
                />
                <span className="text-sm text-zinc-300">{service.name}</span>
              </div>
              <span className="text-sm text-zinc-400">${service.monthlyPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {result.requiredServices.length === 0 && (
        <p className="mt-4 text-zinc-600 text-sm">Select shows to see your plan.</p>
      )}
    </div>
  );
}
