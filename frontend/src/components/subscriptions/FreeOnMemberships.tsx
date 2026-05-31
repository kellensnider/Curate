'use client';

import { motion } from 'framer-motion';
import { SERVICES, type Show } from '../../lib/mockData';

interface FreeOnMembershipsProps {
  /** Watchlist titles already covered by an infinite membership. */
  shows: Show[];
  /** The services the user has infinite (free) access to. */
  infiniteServiceIds: string[];
}

/**
 * Surfaces the titles the user can already watch for free through an infinite
 * membership. These are excluded from the paid month-by-month plan — this is
 * where they show up instead, watchable anytime at $0.
 */
export default function FreeOnMemberships({ shows, infiniteServiceIds }: FreeOnMembershipsProps) {
  if (infiniteServiceIds.length === 0) return null;

  const memberships = SERVICES.filter((s) => infiniteServiceIds.includes(s.id));
  const infiniteSet = new Set(infiniteServiceIds);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-white">Free on your memberships</h2>
        <span className="text-xs text-emerald-400 font-semibold">$0 · watch anytime</span>
      </div>
      <p className="text-zinc-400 text-sm mb-4">
        {memberships.length > 0 ? (
          <>
            You have unlimited access to{' '}
            {memberships.map((m, i) => (
              <span key={m.id}>
                <span className="font-semibold" style={{ color: m.brandColor }}>
                  {m.name}
                </span>
                {i < memberships.length - 2
                  ? ', '
                  : i === memberships.length - 2
                  ? ' and '
                  : ''}
              </span>
            ))}
            , so these titles are already covered and left out of your paid plan.
          </>
        ) : (
          'These titles are already covered by a free membership.'
        )}
      </p>

      {shows.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center text-zinc-500 text-sm">
          Nothing on your watchlist is on these memberships yet.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-emerald-900/40 rounded-2xl p-4">
          <div className="flex gap-2 flex-wrap">
            {shows.map((show, i) => {
              const onService = show.streamingServices.find((s) => infiniteSet.has(s));
              const svc = SERVICES.find((s) => s.id === onService);
              return (
                <motion.div
                  key={show.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.03 }}
                  className="rounded-lg overflow-hidden shrink-0"
                  style={{ width: 56, height: 84 }}
                  title={svc ? `${show.title} · ${svc.name}` : show.title}
                >
                  <img
                    src={show.posterUrl}
                    alt={show.title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
