'use client';

import { motion } from 'framer-motion';
import { SERVICES, type MonthPlan } from '../../lib/mockData';
import { useWatchedStore } from '../../store/useWatchedStore';

interface WatchThisMonthProps {
  month: MonthPlan;
}

/**
 * The titles Curate suggests watching this month — the top picks covered by
 * this month's plan. Marking one watched feeds the next audit so the plan
 * recomputes around what's left.
 */
export default function WatchThisMonth({ month }: WatchThisMonthProps) {
  const { watchedIds, markWatched, unmarkWatched } = useWatchedStore();

  if (month.watch.length === 0) return null;

  const planServiceIds = new Set(month.plan.requiredServices.map((s) => s.id));

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-white">Watch this month</h2>
        <span className="text-xs text-zinc-500">
          {month.watch.length} {month.watch.length === 1 ? 'title' : 'titles'}
        </span>
      </div>
      <p className="text-zinc-400 text-sm mb-4">
        Your top picks on this month&apos;s services. Check them off as you finish.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {month.watch.map((show, i) => {
          const watched = watchedIds.includes(show.id);
          // Which of this month's services actually carries the title.
          const onService = show.streamingServices.find((s) => planServiceIds.has(s));
          const svc = SERVICES.find((s) => s.id === onService);
          return (
            <motion.div
              key={show.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="relative" style={{ aspectRatio: '2/3' }}>
                <img
                  src={show.posterUrl}
                  alt={show.title}
                  className={`w-full h-full object-cover transition-opacity ${
                    watched ? 'opacity-30' : ''
                  }`}
                />
                <span className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  #{i + 1}
                </span>
                {watched && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      ✓ Watched
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <p className="text-sm font-semibold text-white leading-tight line-clamp-2">
                  {show.title}
                </p>
                {svc && (
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: svc.brandColor }}
                    />
                    {svc.name}
                  </span>
                )}
                <button
                  onClick={() =>
                    watched ? unmarkWatched(show.id) : markWatched(show.id)
                  }
                  className={`mt-auto text-xs font-semibold py-2 rounded-lg transition-colors ${
                    watched
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {watched ? 'Undo' : 'Mark watched'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
