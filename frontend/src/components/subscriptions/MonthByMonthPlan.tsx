'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICES, ALL_SERVICES_TOTAL, type WatchPlan } from '../../lib/mockData';

interface MonthByMonthPlanProps {
  plan: WatchPlan;
}

function monthLabel(monthIndex: number): string {
  if (monthIndex === 0) return 'This month';
  // Anchor to the 1st so adding months never overflows a short month
  // (e.g. May 31 + 1mo must be June, not July 1).
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + monthIndex, 1);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

/**
 * A month-by-month subscription schedule: each month shows which services to
 * hold, what it costs, and the titles you'll finish — assuming you complete
 * your monthly quota before moving on.
 */
export default function MonthByMonthPlan({ plan }: MonthByMonthPlanProps) {
  const [open, setOpen] = useState<number | null>(0);

  if (plan.months.length === 0) return null;

  // What buying every service for the same number of months would cost.
  const naiveCost = ALL_SERVICES_TOTAL * plan.months.length;
  const saved = Math.max(0, naiveCost - plan.totalCost);

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-1">Your month-by-month plan</h2>
      <p className="text-zinc-400 text-sm mb-4">
        Finish your watchlist in{' '}
        <span className="text-white font-semibold">
          {plan.monthsToFinish} {plan.monthsToFinish === 1 ? 'month' : 'months'}
        </span>{' '}
        for{' '}
        <span className="text-emerald-400 font-semibold">
          ${plan.totalCost.toFixed(2)}
        </span>{' '}
        total
        {saved > 0 && (
          <>
            {' '}— saving{' '}
            <span className="text-emerald-400 font-semibold">${saved.toFixed(2)}</span>{' '}
            vs. subscribing to everything.
          </>
        )}
      </p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
        {plan.months.map((m) => {
          const isOpen = open === m.monthIndex;
          return (
            <div key={m.monthIndex}>
              <button
                onClick={() => setOpen(isOpen ? null : m.monthIndex)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-800/40 transition-colors"
              >
                <span className="w-20 sm:w-28 shrink-0 text-sm font-semibold text-white">
                  {monthLabel(m.monthIndex)}
                </span>

                {/* Service chips for the month */}
                <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                  {m.plan.purchases.length === 0 ? (
                    <span className="text-xs text-zinc-500">No subscription</span>
                  ) : (
                    m.plan.purchases.map((p) => {
                      const color =
                        SERVICES.find((s) => s.id === p.services[0])?.brandColor ?? '#52525b';
                      return (
                        <span
                          key={p.id}
                          className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                          style={{ color, borderColor: `${color}66` }}
                        >
                          {p.name}
                        </span>
                      );
                    })
                  )}
                </div>

                <span className="shrink-0 text-sm font-bold text-white tabular-nums">
                  ${m.plan.monthlyTotal.toFixed(2)}
                </span>
                <span className="shrink-0 text-xs text-zinc-500 w-14 text-right">
                  {m.watch.length} {m.watch.length === 1 ? 'title' : 'titles'}
                </span>
                <svg
                  className={`shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 flex gap-2 flex-wrap">
                      {m.watch.map((show) => (
                        <div
                          key={show.id}
                          className="rounded-lg overflow-hidden shrink-0"
                          style={{ width: 46, height: 69 }}
                          title={show.title}
                        >
                          <img
                            src={show.posterUrl}
                            alt={show.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {plan.unreachable.length > 0 && (
        <p className="text-xs text-zinc-500 mt-3">
          {plan.unreachable.length}{' '}
          {plan.unreachable.length === 1 ? 'title isn’t' : 'titles aren’t'} covered by
          any plan within your budget and {plan.months.length}-month horizon. Raise
          your budget or shows-per-month to reach {plan.unreachable.length === 1 ? 'it' : 'them'}.
        </p>
      )}
    </section>
  );
}
