'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SERVICES } from '../../lib/mockData';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useBillingStore, type BillingCycle } from '../../store/useBillingStore';
import { useAuthStore } from '../../store/useAuthStore';
import Navbar from '../../components/navigation/Navbar';
import InfiniteMembershipControl from '../../components/subscriptions/InfiniteMembershipControl';

export default function SubscriptionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    subscriptions,
    prices,
    fetchSubscriptions,
    fetchPrices,
    activate,
    cancel,
    setInfiniteMembership,
  } = useSubscriptionStore();
  const { entries, setEntry, clearEntry, getDaysUntilRenewal, getMonthsUntilRenewal } =
    useBillingStore();

  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth?mode=signin');
      return;
    }
    fetchSubscriptions();
    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const monthlyTotal = activeSubs.reduce((sum, s) => sum + effectiveCost(s), 0);

  function priceOf(id: string) {
    return prices[id]?.monthly ?? SERVICES.find((s) => s.id === id)?.monthlyPrice ?? 0;
  }

  function effectiveCost(sub: { monthlyCost: number; effectiveMonthlyCost?: number; infiniteMembership?: boolean }) {
    return sub.infiniteMembership ? 0 : sub.effectiveMonthlyCost ?? sub.monthlyCost;
  }

  async function toggle(id: string, isActive: boolean) {
    const sub = subscriptions.find((s) => s.service === id);
    if (sub?.infiniteMembership) return;
    setBusy(id);
    try {
      if (isActive) {
        await cancel(id);
        clearEntry(id);
      } else {
        await activate(id);
      }
    } finally {
      setBusy(null);
    }
  }

  async function toggleInfiniteMembership(id: string, enabled: boolean) {
    setBusy(id);
    try {
      await setInfiniteMembership(id, enabled);
    } finally {
      setBusy(null);
    }
  }

  function describeDuration(id: string): string | null {
    const entry = entries[id];
    const sub = subscriptions.find((s) => s.service === id);
    if (sub?.infiniteMembership) return 'Infinite membership · $0/mo';
    if (!entry) return null;
    if (entry.cycle === 'annual') {
      const m = getMonthsUntilRenewal(id);
      return m !== null ? `Annual · ${m} month${m === 1 ? '' : 's'} left` : 'Annual';
    }
    const d = getDaysUntilRenewal(id);
    return d !== null ? `Monthly · renews in ${d <= 0 ? 0 : d}d` : 'Monthly';
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black text-white">Current Subscriptions</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Tell Curate what you already pay for and how long each one lasts.
          </p>
        </motion.div>

        {/* Spend summary */}
        <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
              Current monthly spend
            </p>
            <p className="text-3xl font-black text-white mt-1">${monthlyTotal.toFixed(2)}</p>
          </div>
          <p className="text-sm text-zinc-500">
            {activeSubs.length} active service{activeSubs.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Service list */}
        <div className="space-y-3">
          {SERVICES.map((svc) => {
            const sub = subscriptions.find((s) => s.service === svc.id);
            const isActive = sub?.status === 'active';
            const isInfinite = Boolean(sub?.infiniteMembership);
            const displayCost = sub ? effectiveCost(sub) : priceOf(svc.id);
            const entry = entries[svc.id];
            const duration = describeDuration(svc.id);

            return (
              <div
                key={svc.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isActive ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/40 border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? svc.brandColor : '#3f3f46' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: isActive ? svc.brandColor : '#71717a' }}>
                      {svc.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      ${displayCost.toFixed(2)}/mo
                      {isInfinite && (
                        <span className="ml-2 text-zinc-600">
                          Normally ${priceOf(svc.id).toFixed(2)}/mo
                        </span>
                      )}
                      {isActive && duration ? ` · ${duration}` : ''}
                    </p>
                  </div>

                  <div className="shrink-0 space-y-2">
                    {/* Toggle */}
                    <button
                      onClick={() => toggle(svc.id, !!isActive)}
                      disabled={busy === svc.id || isInfinite}
                      className={`ml-auto block w-12 h-7 rounded-full relative transition-colors disabled:opacity-50 ${
                        isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                      aria-pressed={isActive}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                          isActive ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                    <InfiniteMembershipControl
                      enabled={isInfinite}
                      disabled={busy === svc.id}
                      onChange={(enabled) => toggleInfiniteMembership(svc.id, enabled)}
                    />
                  </div>
                </div>

                {/* Duration controls (only when active) */}
                {isActive && !isInfinite && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap items-center gap-3">
                    <label className="text-xs text-zinc-500">Renews / ends</label>
                    <input
                      type="date"
                      value={entry?.renewalDate ?? ''}
                      onChange={(e) =>
                        setEntry(
                          svc.id,
                          e.target.value,
                          sub ? effectiveCost(sub) : priceOf(svc.id),
                          entry?.cycle ?? 'monthly',
                        )
                      }
                      className="text-xs bg-zinc-800 border border-zinc-700 text-white px-2 py-1.5 rounded-lg focus:outline-none focus:border-zinc-500"
                    />
                    <select
                      value={entry?.cycle ?? 'monthly'}
                      onChange={(e) =>
                        setEntry(
                          svc.id,
                          entry?.renewalDate ?? '',
                          sub ? effectiveCost(sub) : priceOf(svc.id),
                          e.target.value as BillingCycle,
                        )
                      }
                      disabled={!entry?.renewalDate && !entry}
                      className="text-xs bg-zinc-800 border border-zinc-700 text-white px-2 py-1.5 rounded-lg focus:outline-none focus:border-zinc-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                    {entry && (
                      <button
                        onClick={() => clearEntry(svc.id)}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors ml-auto"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                {isActive && isInfinite && (
                  <div className="mt-3 pt-3 border-t border-zinc-800 text-xs font-semibold text-emerald-300">
                    Free ongoing access. Renewal date and billing interval are not needed.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-100 active:scale-[0.99] transition-all text-sm"
          >
            Done → Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
