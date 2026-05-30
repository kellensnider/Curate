'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICES, ALL_SERVICES_TOTAL } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import Navbar from '../../components/navigation/Navbar';

const STEPS = ['Your Shows', 'Subscription Changes', 'Savings Summary'];

export default function ConfirmPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [applying, setApplying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { watchlistAsShows } = useShowStore();
  const { subscriptions, optimizedPlan, selectedPlan, confirmPlan, activate, cancel } =
    useSubscriptionStore();

  // Honor the user's edited selection from the dashboard; fall back to the optimal plan.
  const plan = selectedPlan ?? optimizedPlan;
  const watchlistShows = watchlistAsShows();
  const activeServiceIds = plan?.requiredServices.map((s) => s.id) ?? [];
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const currentMonthly = activeSubs.reduce((sum, s) => sum + s.monthlyCost, 0);

  // Group shows by service
  const showsByService: Record<string, typeof watchlistShows> = {};
  for (const show of watchlistShows) {
    const svcId =
      show.streamingServices.find((id) => activeServiceIds.includes(id)) ??
      show.streamingServices[0] ??
      'other';
    if (!showsByService[svcId]) showsByService[svcId] = [];
    showsByService[svcId].push(show);
  }

  async function handleConfirm() {
    if (!plan) return;
    setApplying(true);
    try {
      const toActivate = plan.requiredServices.filter(
        (s) => !activeSubs.find((a) => a.service === s.id),
      );
      const toCancel = activeSubs.filter(
        (a) => !plan.requiredServices.find((r) => r.id === a.service),
      );
      for (const svc of toActivate) await activate(svc.id);
      for (const sub of toCancel) await cancel(sub.service);
      confirmPlan();
      setConfirmed(true);
      setTimeout(() => router.push('/profile'), 2000);
    } finally {
      setApplying(false);
    }
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-24 text-center">
          <p className="text-zinc-400 mb-4">No plan to confirm yet.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-black font-semibold px-6 py-3 rounded-xl"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <svg width="36" height="30" viewBox="0 0 36 30" fill="none">
              <path d="M3 15L13 25L33 3" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <h2 className="text-3xl font-bold text-white">Plan Activated!</h2>
          <p className="text-zinc-400 mt-2">Heading to your profile…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  i === step ? 'text-white' : i < step ? 'text-emerald-400' : 'text-zinc-600'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                    i < step
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : i === step
                      ? 'border-white text-white'
                      : 'border-zinc-700 text-zinc-600'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px transition-colors ${i < step ? 'bg-emerald-700' : 'bg-zinc-800'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 0: Shows */}
            {step === 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Your Shows</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  {watchlistShows.length} show{watchlistShows.length !== 1 ? 's' : ''} in your watchlist
                </p>
                {Object.entries(showsByService).map(([svcId, shows]) => {
                  const svc = SERVICES.find((s) => s.id === svcId);
                  return (
                    <div key={svcId} className="mb-6">
                      {svc && (
                        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: svc.brandColor }}>
                          {svc.name}
                        </p>
                      )}
                      <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                        {shows.map((show) => (
                          <div key={show.id} className="rounded-xl overflow-hidden" style={{ aspectRatio: '2/3' }}>
                            <img src={show.posterUrl} alt={show.title} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 1: Changes */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Subscription Changes</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  Activating {activeServiceIds.length} service{activeServiceIds.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-3">
                  {SERVICES.map((service) => {
                    const isActive = activeServiceIds.includes(service.id);
                    const wasActive = activeSubs.some((s) => s.service === service.id);
                    const action = isActive && !wasActive ? 'activate' : !isActive && wasActive ? 'cancel' : isActive ? 'keep' : 'skip';
                    return (
                      <div
                        key={service.id}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          action === 'activate' ? 'bg-emerald-950/30 border-emerald-900/50'
                          : action === 'cancel' ? 'bg-red-950/20 border-red-900/30'
                          : action === 'keep' ? 'bg-zinc-900 border-zinc-700'
                          : 'bg-zinc-900/30 border-zinc-800 opacity-40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                            action === 'activate' ? 'border-emerald-500' : action === 'cancel' ? 'border-red-500' : action === 'keep' ? 'border-zinc-600' : 'border-zinc-800'
                          }`}>
                            {action === 'activate' && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            {action === 'cancel' && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                            {action === 'keep' && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>
                          <span className="font-semibold text-sm" style={{ color: isActive ? service.brandColor : '#52525b' }}>
                            {service.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                            ${service.monthlyPrice.toFixed(2)}/mo
                          </p>
                          <p className={`text-xs ${action === 'activate' ? 'text-emerald-400' : action === 'cancel' ? 'text-red-400' : action === 'keep' ? 'text-zinc-500' : 'text-zinc-700'}`}>
                            {action === 'activate' ? 'Activating' : action === 'cancel' ? 'Cancelling' : action === 'keep' ? 'Keeping' : 'Skipping'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Savings */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Savings Summary</h2>
                <p className="text-zinc-400 text-sm mb-8">Here's what Curate saves you</p>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-zinc-500 text-sm">Current spend ({activeSubs.length} services)</p>
                    <p className="text-zinc-500 text-lg line-through">${currentMonthly.toFixed(2)}/mo</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                    <p className="text-white font-semibold">Your Curate plan</p>
                    <p className="text-white text-3xl font-black">${plan.monthlyTotal.toFixed(2)}/mo</p>
                  </div>
                  {plan.monthlySavings > 0 && (
                    <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-emerald-300 font-semibold">Monthly savings</p>
                        <p className="text-emerald-400 text-2xl font-black">${plan.monthlySavings.toFixed(2)}</p>
                      </div>
                      <p className="text-emerald-700 text-sm mt-2">
                        That's{' '}
                        <span className="text-emerald-500 font-semibold">${(plan.monthlySavings * 12).toFixed(0)}</span>{' '}
                        back in your pocket per year
                      </p>
                    </div>
                  )}
                </div>
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
              className="flex-1 bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-zinc-100 transition"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={applying}
              className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-emerald-400 disabled:opacity-50 transition-all"
            >
              {applying ? 'Applying…' : 'Activate Curate Plan ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
