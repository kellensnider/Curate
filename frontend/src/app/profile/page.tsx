'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SERVICES } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import Navbar from '../../components/navigation/Navbar';

export default function ProfilePage() {
  const router = useRouter();
  const { watchlist, watchlistLoading, fetchWatchlist, watchlistAsShows, removeShowFromWatchlist } =
    useShowStore();
  const { subscriptions, optimizedPlan, fetchSubscriptions } = useSubscriptionStore();

  useEffect(() => {
    fetchWatchlist();
    fetchSubscriptions();
  }, []);

  const plan = optimizedPlan;
  const activeServiceIds = plan?.requiredServices.map((s) => s.id) ?? [];
  const watchlistShows = watchlistAsShows();
  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  // Group watchlist shows by their covered service (or first service)
  const showsByService: Record<string, typeof watchlistShows> = {};
  for (const show of watchlistShows) {
    const svcId =
      show.streamingServices.find((id) => activeServiceIds.includes(id)) ??
      show.streamingServices[0] ??
      'other';
    if (!showsByService[svcId]) showsByService[svcId] = [];
    showsByService[svcId].push(show);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl font-black text-white">My Profile</h1>
          <p className="text-zinc-400 text-sm mt-1">Your watchlist and active plan</p>
        </motion.div>

        {/* Active plan */}
        {activeSubs.length > 0 ? (
          <section className="mb-10">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Active Plan
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {activeSubs.map((sub) => {
                const svc = SERVICES.find((s) => s.id === sub.service);
                return (
                  <div
                    key={sub.service}
                    className="rounded-2xl p-4 border-2 bg-zinc-900"
                    style={{ borderColor: svc?.brandColor, boxShadow: `0 0 16px ${svc?.brandColor}18` }}
                  >
                    <p className="text-sm font-black tracking-tight" style={{ color: svc?.brandColor }}>
                      {svc?.logo ?? sub.displayName}
                    </p>
                    <p className="text-white font-bold mt-2">${sub.monthlyCost.toFixed(2)}</p>
                    <p className="text-zinc-500 text-xs">/month</p>
                  </div>
                );
              })}
            </div>

            {/* Combined cost vs watchlist */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Monthly spend</p>
                <p className="text-white font-bold text-lg">
                  ${activeSubs.reduce((s, sub) => s + sub.monthlyCost, 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Watchlist size</p>
                <p className="text-white font-bold text-lg">{watchlistShows.length}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Shows covered</p>
                <p className="text-emerald-400 font-bold text-lg">
                  {watchlistShows.filter((show) =>
                    show.streamingServices.some((id) => activeSubs.some((a) => a.service === id)),
                  ).length}
                </p>
              </div>
              {plan && plan.monthlySavings > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">You save</p>
                  <p className="text-emerald-400 font-bold text-lg">${plan.monthlySavings.toFixed(2)}/mo</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="mb-10 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
            <p className="text-zinc-400 mb-3">No active subscriptions yet.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-zinc-100 transition"
            >
              Build My Plan
            </button>
          </div>
        )}

        {/* Wishlist (watchlist CRUD) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              My Watchlist ({watchlistShows.length})
            </h2>
            <button
              onClick={() => router.push('/browse')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              + Add shows
            </button>
          </div>

          {watchlistLoading && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-zinc-800 animate-pulse" style={{ aspectRatio: '2/3' }} />
              ))}
            </div>
          )}

          {!watchlistLoading && watchlistShows.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-sm">
              Your watchlist is empty.{' '}
              <button onClick={() => router.push('/browse')} className="text-zinc-400 underline">
                Browse shows →
              </button>
            </div>
          )}

          {!watchlistLoading && Object.entries(showsByService).map(([svcId, shows]) => {
            const svc = SERVICES.find((s) => s.id === svcId);
            return (
              <div key={svcId} className="mb-6">
                {svc && (
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: svc.brandColor }}>
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
                      <img src={show.posterUrl} alt={show.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex flex-col items-center justify-center gap-1 p-1">
                        <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity leading-tight text-center line-clamp-2">
                          {show.title}
                        </p>
                        <button
                          onClick={() => removeShowFromWatchlist(show.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 text-xs bg-black/50 px-2 py-0.5 rounded-full transition-opacity hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Detail list view */}
          {watchlistShows.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                All items (ranked)
              </p>
              {watchlist
                .slice()
                .sort((a, b) => a.rank - b.rank)
                .map((item, idx) => {
                  const svc = SERVICES.find((s) => s.id === item.show.services?.[0]);
                  return (
                    <div
                      key={item._id}
                      className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                    >
                      <span className="text-zinc-600 text-xs w-4 text-center">{idx + 1}</span>
                      <img
                        src={`https://picsum.photos/seed/${encodeURIComponent(item.show.title)}/300/450`}
                        alt={item.show.title}
                        className="w-9 h-12 object-cover rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.show.title}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{item.show.year}</p>
                      </div>
                      {svc && (
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: svc.brandColor }} />
                      )}
                      <button
                        onClick={() => removeShowFromWatchlist(item.show_id)}
                        className="text-zinc-700 hover:text-red-400 transition-colors text-base leading-none shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
