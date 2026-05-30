'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SERVICES, SHOWS } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import Navbar from '../../components/navigation/Navbar';

export default function ProfilePage() {
  const router = useRouter();
  const { selectedShowIds, watchlist, removeFromWatchlist } = useShowStore();
  const { optimizedPlan } = useSubscriptionStore();

  const plan = optimizedPlan;
  const activeServiceIds = plan?.requiredServices.map((s) => s.id) ?? [];
  const selectedShows = SHOWS.filter((s) => selectedShowIds.includes(s.id));

  // Group selected shows by service
  const showsByService: Record<string, typeof selectedShows> = {};
  for (const show of selectedShows) {
    const svcId = show.streamingServices.find((id) => activeServiceIds.includes(id))
      ?? show.streamingServices[0]
      ?? 'other';
    if (!showsByService[svcId]) showsByService[svcId] = [];
    showsByService[svcId].push(show);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-black text-white">My Profile</h1>
          <p className="text-zinc-400 text-sm mt-1">Your watchlist and active plan</p>
        </motion.div>

        {/* Active plan summary */}
        {plan && plan.requiredServices.length > 0 ? (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Active Plan
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {plan.requiredServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl p-4 border-2 bg-zinc-900"
                  style={{ borderColor: service.brandColor, boxShadow: `0 0 16px ${service.brandColor}18` }}
                >
                  <p
                    className="text-sm font-black tracking-tight"
                    style={{ color: service.brandColor }}
                  >
                    {service.logo}
                  </p>
                  <p className="text-white font-bold mt-2">${service.monthlyPrice.toFixed(2)}</p>
                  <p className="text-zinc-500 text-xs">/month</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-0.5">
                  Monthly total
                </p>
                <p className="text-white font-bold text-xl">${plan.monthlyTotal.toFixed(2)}</p>
              </div>
              {plan.monthlySavings > 0 && (
                <div className="ml-auto text-right">
                  <p className="text-zinc-400 text-xs uppercase tracking-wider mb-0.5">
                    You save
                  </p>
                  <p className="text-emerald-400 font-bold text-xl">
                    ${plan.monthlySavings.toFixed(2)}/mo
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="mb-10 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
            <p className="text-zinc-400 mb-3">No active plan yet.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-white text-black font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors text-sm"
            >
              Build My Plan
            </button>
          </div>
        )}

        {/* My list — shows grouped by service */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              My Shows ({selectedShows.length})
            </h2>
            {selectedShows.length > 0 && (
              <button
                onClick={() => router.push('/')}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Edit →
              </button>
            )}
          </div>

          {selectedShows.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-sm">
              No shows selected.{' '}
              <button onClick={() => router.push('/')} className="text-zinc-400 underline">
                Pick some shows
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(showsByService).map(([svcId, shows]) => {
                const svc = SERVICES.find((s) => s.id === svcId);
                return (
                  <div key={svcId}>
                    {svc && (
                      <p
                        className="text-xs font-bold uppercase tracking-wider mb-3"
                        style={{ color: svc.brandColor }}
                      >
                        {svc.name}
                      </p>
                    )}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {shows.map((show) => (
                        <div
                          key={show.id}
                          className="rounded-xl overflow-hidden group relative cursor-pointer"
                          style={{ aspectRatio: '2/3' }}
                        >
                          <img
                            src={show.posterUrl}
                            alt={show.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-1.5">
                            <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity leading-tight line-clamp-2">
                              {show.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Watchlist (explicitly saved) */}
        {watchlist.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Saved Watchlist ({watchlist.length})
            </h2>
            <div className="space-y-2">
              {watchlist.map((show) => (
                <div
                  key={show.id}
                  className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                >
                  <img
                    src={show.posterUrl}
                    alt={show.title}
                    className="w-10 h-14 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{show.title}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {show.year} · ⭐ {show.rating}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromWatchlist(show.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
