'use client';

import { motion } from 'framer-motion';
import { ALL_SERVICES_TOTAL, type WatchPlan } from '../../lib/mockData';

interface MonthByMonthPlanProps {
  plan: WatchPlan;
  /** Services the user owns outright (unlimited / $0) — tagged in each month. */
  infiniteServiceIds?: string[];
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
 * A month-by-month forecast laid out as side-by-side columns — one per month
 * out to the 6-month horizon (or until the watchlist is finished). Each column
 * shows the services you'll be subscribed to that month and poster art for the
 * titles you'll watch, assuming you finish your monthly quota before moving on.
 */
export default function MonthByMonthPlan({ plan, infiniteServiceIds = [] }: MonthByMonthPlanProps) {
  if (plan.months.length === 0) return null;
  const infinite = new Set(infiniteServiceIds);

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

      {/* Horizontal forecast: a column per month, scrollable on narrow screens. */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {plan.months.map((m, i) => (
          <motion.div
            key={m.monthIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className="snap-start shrink-0 w-44 sm:w-48 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Month header: label, cost, title count */}
            <div className="px-3.5 pt-3.5 pb-3 border-b border-zinc-800/60">
              <p className="text-sm font-bold text-white">{monthLabel(m.monthIndex)}</p>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-base font-bold text-emerald-400 tabular-nums">
                  ${m.plan.monthlyTotal.toFixed(2)}
                  <span className="text-xs text-zinc-500 font-normal">/mo</span>
                </span>
                <span className="text-xs text-zinc-500">
                  {m.watch.length} {m.watch.length === 1 ? 'title' : 'titles'}
                </span>
              </div>
            </div>

            {/* Services you'll be subscribed to this month */}
            <div className="px-3.5 py-3 border-b border-zinc-800/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
                Subscribed to
              </p>
              {m.plan.requiredServices.length === 0 ? (
                <span className="text-xs text-zinc-500">No subscription</span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {m.plan.requiredServices.map((svc) => {
                    const owned = infinite.has(svc.id);
                    return (
                      <span key={svc.id} className="flex items-center gap-2 text-xs font-semibold text-white">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: svc.brandColor }}
                        />
                        <span className="truncate">{svc.name}</span>
                        {owned && (
                          <span className="ml-auto text-[10px] font-semibold text-emerald-400 shrink-0">
                            $0
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Posters of the shows you'll watch this month */}
            <div className="px-3.5 py-3 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
                You&apos;ll watch
              </p>
              {m.watch.length === 0 ? (
                <span className="text-xs text-zinc-500">Nothing scheduled</span>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {m.watch.map((show) => (
                    <div
                      key={show.id}
                      className="rounded-md overflow-hidden aspect-[2/3] bg-zinc-800"
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
              )}
            </div>
          </motion.div>
        ))}
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
