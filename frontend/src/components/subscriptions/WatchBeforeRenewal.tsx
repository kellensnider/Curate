'use client';

import { useMemo } from 'react';
import { useBillingStore } from '../../store/useBillingStore';
import { useShowStore } from '../../store/useShowStore';
import { SERVICES } from '../../lib/mockData';

export default function WatchBeforeRenewal() {
  const { entries, getDaysUntilRenewal } = useBillingStore();
  const { watchlistAsShows } = useShowStore();

  const watchlistShows = watchlistAsShows();

  const sections = useMemo(() => {
    return Object.values(entries)
      .map((entry) => {
        const days = getDaysUntilRenewal(entry.service);
        const svc = SERVICES.find((s) => s.id === entry.service);
        const shows = watchlistShows.filter((show) =>
          show.streamingServices.includes(entry.service),
        );
        return { entry, days, svc, shows };
      })
      .filter((s) => s.shows.length > 0)
      .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));
  }, [entries, watchlistShows]);

  if (sections.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Watch Before Renewal
        </p>
        <p className="text-zinc-600 text-sm">
          Set renewal dates on the Timeline page to see what to watch first.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Watch Before Renewal
      </p>

      {sections.map(({ entry, days, svc, shows }) => {
        const urgent = days !== null && days <= 7;
        const soon = days !== null && days <= 14;

        return (
          <div key={entry.service}>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm font-bold"
                style={{ color: svc?.brandColor ?? '#aaa' }}
              >
                {svc?.name ?? entry.service}
              </span>
              {days !== null && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    urgent
                      ? 'bg-red-950/60 text-red-400 border border-red-900/60'
                      : soon
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-900/60'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {days <= 0 ? 'Renews today' : `${days}d left`}
                </span>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {shows.slice(0, 6).map((show) => (
                <div
                  key={show.id}
                  className="shrink-0 rounded-lg overflow-hidden"
                  style={{ width: 52, height: 78 }}
                >
                  <img
                    src={show.posterUrl}
                    alt={show.title}
                    className="w-full h-full object-cover"
                    title={show.title}
                  />
                </div>
              ))}
              {shows.length > 6 && (
                <div
                  className="shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs"
                  style={{ width: 52, height: 78 }}
                >
                  +{shows.length - 6}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
