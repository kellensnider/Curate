'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useShowStore } from '../../store/useShowStore';
import { useBillingStore } from '../../store/useBillingStore';
import { SERVICES } from '../../lib/mockData';
import BillingCapture from '../../components/subscriptions/BillingCapture';
import Navbar from '../../components/navigation/Navbar';

export default function TimelinePage() {
  const { subscriptions, fetchSubscriptions } = useSubscriptionStore();
  const { watchlistAsShows, fetchWatchlist } = useShowStore();
  const { entries, getDaysUntilRenewal } = useBillingStore();

  useEffect(() => {
    fetchSubscriptions();
    fetchWatchlist();
  }, []);

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const watchlistShows = watchlistAsShows();

  // Sort: subscriptions with renewal dates first (closest first), then rest
  const sorted = [...activeSubs].sort((a, b) => {
    const da = getDaysUntilRenewal(a.service) ?? 9999;
    const db = getDaysUntilRenewal(b.service) ?? 9999;
    return da - db;
  });

  // Generate next 6 months for header
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    return d.toLocaleString('default', { month: 'short', year: '2-digit' });
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-black text-white">Subscription Timeline</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Renewal dates and what to watch before they hit.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            {activeSubs.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
                No active subscriptions found.
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* Month header */}
                <div className="flex border-b border-zinc-800">
                  <div className="w-32 shrink-0 px-4 py-2.5 text-xs text-zinc-500 font-medium">
                    Service
                  </div>
                  {months.map((m) => (
                    <div key={m} className="flex-1 text-center text-xs text-zinc-600 py-2.5 border-l border-zinc-800/60">
                      {m}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {sorted.map((sub, rowIdx) => {
                  const svc = SERVICES.find((s) => s.id === sub.service);
                  const entry = entries[sub.service];
                  const days = getDaysUntilRenewal(sub.service);
                  const covered = watchlistShows.filter((show) =>
                    show.streamingServices.includes(sub.service),
                  );

                  // Compute which month column the renewal falls in (0–5)
                  let renewalCol: number | null = null;
                  if (entry) {
                    const renewDate = new Date(entry.renewalDate);
                    const now = new Date();
                    const diffMonths =
                      (renewDate.getFullYear() - now.getFullYear()) * 12 +
                      (renewDate.getMonth() - now.getMonth());
                    if (diffMonths >= 0 && diffMonths < 6) renewalCol = diffMonths;
                  }

                  return (
                    <div
                      key={sub.service}
                      className={`flex border-b border-zinc-800/40 ${rowIdx % 2 === 0 ? '' : 'bg-zinc-900/50'}`}
                    >
                      <div className="w-32 shrink-0 px-4 py-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: svc?.brandColor ?? '#555' }} />
                        <span className="text-xs text-white font-semibold truncate">{svc?.name ?? sub.displayName}</span>
                      </div>

                      {months.map((_, colIdx) => (
                        <div
                          key={colIdx}
                          className="flex-1 relative border-l border-zinc-800/40 py-3 flex items-center justify-center"
                        >
                          {/* Subscription bar */}
                          {colIdx === 0 && (
                            <div
                              className="absolute left-1 right-0 h-1.5 rounded-full opacity-30"
                              style={{ backgroundColor: svc?.brandColor ?? '#666' }}
                            />
                          )}
                          {colIdx > 0 && (
                            <div
                              className="absolute left-0 right-0 h-1.5 rounded-none opacity-20"
                              style={{ backgroundColor: svc?.brandColor ?? '#666' }}
                            />
                          )}
                          {renewalCol === colIdx && (
                            <div
                              className="w-3 h-3 rounded-full border-2 border-zinc-950 z-10"
                              style={{ backgroundColor: svc?.brandColor ?? '#fff' }}
                              title={`Renews ${entry?.renewalDate}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Legend */}
                <div className="px-4 py-3 flex items-center gap-4 text-xs text-zinc-600">
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-1.5 rounded bg-zinc-600 opacity-50" /> Active
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white border-2 border-zinc-800" /> Renewal
                  </span>
                </div>
              </div>
            )}

            {/* Per-service watch lists */}
            {sorted.map((sub) => {
              const svc = SERVICES.find((s) => s.id === sub.service);
              const days = getDaysUntilRenewal(sub.service);
              const covered = watchlistShows.filter((s) => s.streamingServices.includes(sub.service));
              if (covered.length === 0) return null;

              return (
                <div key={sub.service} className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm" style={{ color: svc?.brandColor }}>
                      {svc?.name}
                    </span>
                    {days !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${days <= 7 ? 'bg-red-950/60 text-red-400' : days <= 14 ? 'bg-amber-950/60 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {days <= 0 ? 'Renews today' : `${days}d to renewal`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">
                    Watch before renewal ({covered.length} in list):
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {covered.slice(0, 8).map((show) => (
                      <div
                        key={show.id}
                        className="rounded-lg overflow-hidden"
                        style={{ width: 44, height: 66 }}
                        title={show.title}
                      >
                        <img src={show.posterUrl} alt={show.title} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {covered.length > 8 && (
                      <div
                        className="rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs"
                        style={{ width: 44, height: 66 }}
                      >
                        +{covered.length - 8}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Billing capture sidebar */}
          <div className="lg:col-span-1">
            <BillingCapture activeSubscriptions={activeSubs} />

            {/* Monthly cost summary */}
            <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Monthly Spend
              </p>
              {activeSubs.map((sub) => {
                const svc = SERVICES.find((s) => s.id === sub.service);
                return (
                  <div key={sub.service} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: svc?.brandColor ?? '#555' }} />
                      <span className="text-sm text-zinc-300">{sub.displayName}</span>
                    </div>
                    <span className="text-sm text-zinc-400">${sub.monthlyCost.toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="border-t border-zinc-800 mt-2 pt-2 flex justify-between">
                <span className="text-sm text-white font-semibold">Total</span>
                <span className="text-white font-bold">
                  ${activeSubs.reduce((s, sub) => s + sub.monthlyCost, 0).toFixed(2)}/mo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
