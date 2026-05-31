'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICES, ALL_SERVICES_TOTAL } from '../../lib/mockData';
import { useAuthStore } from '../../store/useAuthStore';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useBillingStore, type BillingCycle } from '../../store/useBillingStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';

const STEPS = ['Preferences', 'Your subscriptions', 'How long they last'];

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, userName, userEmail } = useAuthStore();
  const {
    maxMonthlyCost,
    maxSubscriptions,
    setMaxMonthlyCost,
    setMaxSubscriptions,
  } = usePreferencesStore();
  const { subscriptions, prices, fetchSubscriptions, fetchPrices, activate, cancel } =
    useSubscriptionStore();
  const { entries, setEntry } = useBillingStore();
  const markComplete = useOnboardingStore((s) => s.markComplete);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    fetchSubscriptions();
    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const monthlyTotal = activeSubs.reduce((sum, s) => sum + s.monthlyCost, 0);

  function priceOf(id: string) {
    return prices[id]?.monthly ?? SERVICES.find((s) => s.id === id)?.monthlyPrice ?? 0;
  }

  async function toggle(id: string, isActive: boolean) {
    setBusy(id);
    try {
      if (isActive) await cancel(id);
      else await activate(id);
    } finally {
      setBusy(null);
    }
  }

  function finish() {
    markComplete(userEmail);
    router.push('/dashboard');
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Minimal top bar */}
      <div className="border-b border-zinc-800/60">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-white font-black text-xl tracking-tight">curate</span>
          <button
            onClick={finish}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-black text-white">
            Welcome{userName ? `, ${userName.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Let&apos;s set up your account so Curate can start saving you money.
          </p>
        </motion.div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors ${
                  i < step
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : i === step
                    ? 'border-white text-white'
                    : 'border-zinc-700 text-zinc-600'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  i === step ? 'text-white' : 'text-zinc-600'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${i < step ? 'bg-emerald-700' : 'bg-zinc-800'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Step 0: Preferences ───────────────────────────── */}
            {step === 0 && (
              <div className="space-y-5">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-white font-semibold">Max monthly cost</p>
                      <p className="text-zinc-500 text-sm mt-0.5">
                        We&apos;ll never recommend a plan above this.
                      </p>
                    </div>
                    <p className="text-3xl font-black text-white">
                      ${maxMonthlyCost}
                      <span className="text-base text-zinc-500 font-medium">/mo</span>
                    </p>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    step={1}
                    value={maxMonthlyCost}
                    onChange={(e) => setMaxMonthlyCost(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-600 mt-2">
                    <span>$5</span>
                    <span>$80</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">
                    Subscribing to everything would cost{' '}
                    <span className="text-zinc-300 font-semibold">
                      ${ALL_SERVICES_TOTAL.toFixed(2)}/mo
                    </span>
                    .
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <p className="text-white font-semibold">Max subscriptions</p>
                  <p className="text-zinc-500 text-sm mt-0.5 mb-4">
                    How many services you&apos;re willing to juggle at once.
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setMaxSubscriptions(n)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                          maxSubscriptions === n
                            ? 'bg-white text-black'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">
                    A bundle (e.g. Disney+ &amp; Hulu) counts as a single subscription.
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 1: Current subscriptions ─────────────────── */}
            {step === 1 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-zinc-400 text-sm">
                    Toggle on everything you currently pay for.
                  </p>
                  <span className="text-sm text-white font-semibold">
                    ${monthlyTotal.toFixed(2)}/mo
                  </span>
                </div>
                <div className="space-y-2">
                  {SERVICES.map((svc) => {
                    const sub = subscriptions.find((s) => s.service === svc.id);
                    const isActive = sub?.status === 'active';
                    return (
                      <div
                        key={svc.id}
                        className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${
                          isActive ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/40 border-zinc-800'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: isActive ? svc.brandColor : '#3f3f46' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-bold"
                            style={{ color: isActive ? svc.brandColor : '#71717a' }}
                          >
                            {svc.name}
                          </p>
                          <p className="text-xs text-zinc-500">${priceOf(svc.id).toFixed(2)}/mo</p>
                        </div>
                        <button
                          onClick={() => toggle(svc.id, !!isActive)}
                          disabled={busy === svc.id}
                          className={`shrink-0 w-12 h-7 rounded-full relative transition-colors disabled:opacity-50 ${
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 2: Durations ─────────────────────────────── */}
            {step === 2 && (
              <div>
                <p className="text-zinc-400 text-sm mb-4">
                  When does each renew? This powers your timeline and &quot;watch before it
                  expires&quot; reminders.
                </p>
                {activeSubs.length === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-sm">
                    No active subscriptions — you can add renewal dates later from the dashboard.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeSubs.map((sub) => {
                      const svc = SERVICES.find((s) => s.id === sub.service);
                      const entry = entries[sub.service];
                      return (
                        <div
                          key={sub.service}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-3"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: svc?.brandColor ?? '#666' }}
                          />
                          <span className="text-sm font-semibold text-white w-24 shrink-0">
                            {svc?.name ?? sub.service}
                          </span>
                          <input
                            type="date"
                            value={entry?.renewalDate ?? ''}
                            onChange={(e) =>
                              setEntry(
                                sub.service,
                                e.target.value,
                                sub.monthlyCost,
                                entry?.cycle ?? 'monthly',
                              )
                            }
                            className="text-xs bg-zinc-800 border border-zinc-700 text-white px-2 py-1.5 rounded-lg focus:outline-none focus:border-zinc-500"
                          />
                          <select
                            value={entry?.cycle ?? 'monthly'}
                            onChange={(e) =>
                              setEntry(
                                sub.service,
                                entry?.renewalDate ?? '',
                                sub.monthlyCost,
                                e.target.value as BillingCycle,
                              )
                            }
                            className="text-xs bg-zinc-800 border border-zinc-700 text-white px-2 py-1.5 rounded-lg focus:outline-none focus:border-zinc-500 ml-auto"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="annual">Annual</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700 transition"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-zinc-100 active:scale-[0.99] transition"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-emerald-400 active:scale-[0.99] transition"
            >
              Finish setup →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
