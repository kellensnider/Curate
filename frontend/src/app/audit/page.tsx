'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useShowStore } from '../../store/useShowStore';
import { SERVICES, ALL_SERVICES_TOTAL } from '../../lib/mockData';
import PipelineProgress, { type PipelineStep } from '../../components/pipeline/PipelineProgress';
import Navbar from '../../components/navigation/Navbar';

const STEPS = ['Current State', 'Coverage Analysis', 'Recommendation', 'Apply Changes'];

export default function AuditPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [applyLoading, setApplyLoading] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const {
    subscriptions,
    optimizedPlan,
    loading: subsLoading,
    fetchSubscriptions,
    fetchPrices,
    runOptimization,
    activate,
    cancel,
  } = useSubscriptionStore();

  const { watchlist, watchlistLoading, fetchWatchlist, watchlistAsShows } = useShowStore();

  const [pipeline, setPipeline] = useState<PipelineStep[]>([
    { label: 'Load subscriptions', status: 'idle' },
    { label: 'Load watchlist', status: 'idle' },
    { label: 'Analyze coverage', status: 'idle' },
    { label: 'Compute plan', status: 'idle' },
  ]);

  function updatePipeline(i: number, status: PipelineStep['status']) {
    setPipeline((prev) => prev.map((s, idx) => (idx === i ? { ...s, status } : s)));
  }

  useEffect(() => {
    (async () => {
      updatePipeline(0, 'loading');
      await fetchSubscriptions();
      await fetchPrices();
      updatePipeline(0, 'done');

      updatePipeline(1, 'loading');
      await fetchWatchlist();
      updatePipeline(1, 'done');

      updatePipeline(2, 'loading');
      await new Promise((r) => setTimeout(r, 300)); // let shows load
      updatePipeline(2, 'done');

      updatePipeline(3, 'loading');
      const shows = useShowStore.getState().watchlistAsShows();
      if (shows.length > 0) runOptimization(shows);
      updatePipeline(3, 'done');
    })();
  }, []);

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const watchlistShows = watchlistAsShows();
  const activeServiceIds = optimizedPlan?.requiredServices.map((s) => s.id) ?? [];

  // Coverage: for each active sub, how many watchlist shows does it cover?
  const coverageData = useMemo(
    () =>
      activeSubs.map((sub) => {
        const covered = watchlistShows.filter((show) =>
          show.streamingServices.includes(sub.service),
        );
        const svc = SERVICES.find((s) => s.id === sub.service);
        return { sub, svc, covered, pct: watchlistShows.length > 0 ? covered.length / watchlistShows.length : 0 };
      }),
    [activeSubs, watchlistShows],
  );

  const currentMonthly = activeSubs.reduce((sum, s) => sum + s.monthlyCost, 0);

  async function applyChanges() {
    if (!optimizedPlan) return;
    setApplyLoading('working');
    try {
      const toActivate = optimizedPlan.requiredServices.filter(
        (s) => !activeSubs.some((a) => a.service === s.id && a.status === 'active'),
      );
      const toCancel = activeSubs.filter(
        (a) => !optimizedPlan.requiredServices.some((r) => r.id === a.service),
      );
      for (const svc of toActivate) await activate(svc.id);
      for (const sub of toCancel) await cancel(sub.service);
      setApplied(true);
      setApplyLoading(null);
    } catch {
      setApplyLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-black text-white">Subscription Audit</h1>
          <p className="text-zinc-400 text-sm mt-1">
            A step-by-step analysis of your streaming spend vs. what you actually want to watch.
          </p>
        </motion.div>

        {/* Pipeline */}
        <div className="mb-8">
          <PipelineProgress steps={pipeline} />
        </div>

        {/* Step tabs */}
        <div className="flex gap-1 mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                step === i ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
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
            {/* Step 0: Current State */}
            {step === 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">Your Current Subscriptions</h2>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {SERVICES.map((svc) => {
                    const sub = subscriptions.find((s) => s.service === svc.id);
                    const isActive = sub?.status === 'active';
                    return (
                      <div
                        key={svc.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-zinc-900 border-2'
                            : 'bg-zinc-900/30 border-zinc-800 opacity-40'
                        }`}
                        style={isActive ? { borderColor: svc.brandColor } : {}}
                      >
                        <p className="text-xs font-black" style={{ color: isActive ? svc.brandColor : '#555' }}>
                          {svc.logo}
                        </p>
                        <p className="text-white font-bold mt-2">${svc.monthlyPrice.toFixed(2)}/mo</p>
                        <p className={`text-xs mt-0.5 ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between">
                  <span className="text-zinc-400 text-sm">Current monthly spend</span>
                  <span className="text-white font-bold">${currentMonthly.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Step 1: Coverage */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Coverage Analysis</h2>
                <p className="text-zinc-400 text-sm mb-4">
                  {watchlistShows.length} shows in your watchlist — here's what each service covers.
                </p>
                {watchlistShows.length === 0 ? (
                  <p className="text-zinc-500 text-sm p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                    Add shows to your watchlist to see coverage data.{' '}
                    <button onClick={() => router.push('/browse')} className="text-zinc-300 underline">Browse shows →</button>
                  </p>
                ) : (
                  <div className="space-y-3">
                    {coverageData
                      .sort((a, b) => b.covered.length - a.covered.length)
                      .map(({ sub, svc, covered, pct }) => (
                        <div key={sub.service} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm" style={{ color: svc?.brandColor }}>
                              {svc?.name ?? sub.displayName}
                            </span>
                            <span className="text-white text-sm font-bold">
                              {covered.length}/{watchlistShows.length} shows
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct * 100}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: svc?.brandColor ?? '#fff' }}
                            />
                          </div>
                          {covered.length === 0 ? (
                            <p className="text-xs text-red-400">⚠ Nothing from your watchlist is on this service</p>
                          ) : (
                            <p className="text-xs text-zinc-500 truncate">
                              {covered.slice(0, 4).map((s) => s.title).join(', ')}
                              {covered.length > 4 && ` +${covered.length - 4} more`}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Recommendation */}
            {step === 2 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">Recommended Plan</h2>
                {!optimizedPlan || optimizedPlan.requiredServices.length === 0 ? (
                  <p className="text-zinc-500 text-sm">
                    Add shows to your watchlist first. {' '}
                    <button onClick={() => router.push('/browse')} className="text-zinc-300 underline">Browse →</button>
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {SERVICES.map((svc) => {
                        const needed = activeServiceIds.includes(svc.id);
                        const covered = watchlistShows.filter((s) => s.streamingServices.includes(svc.id));
                        return (
                          <div
                            key={svc.id}
                            className={`p-4 rounded-xl border transition-all ${
                              needed ? 'bg-zinc-900 border-2' : 'bg-zinc-900/20 border-zinc-800 opacity-30'
                            }`}
                            style={needed ? { borderColor: svc.brandColor } : {}}
                          >
                            <p className="text-xs font-black" style={{ color: needed ? svc.brandColor : '#444' }}>
                              {svc.logo}
                            </p>
                            <p className="text-white font-bold mt-1.5">${svc.monthlyPrice.toFixed(2)}/mo</p>
                            <p className={`text-xs ${needed ? 'text-emerald-400' : 'text-zinc-600'}`}>
                              {needed ? `Covers ${covered.length} shows` : 'Not needed'}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Current spend</span>
                        <span className="text-zinc-400 line-through">${currentMonthly.toFixed(2)}/mo</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white font-semibold">
                          Optimized plan
                          <span className="text-zinc-500 font-normal"> · {optimizedPlan.purchases.map((p) => p.name).join(' + ')}</span>
                        </span>
                        <span className="text-white font-bold">${optimizedPlan.monthlyTotal.toFixed(2)}/mo</span>
                      </div>
                      {currentMonthly - optimizedPlan.monthlyTotal > 0 && (
                        <div className="flex justify-between text-sm pt-1 border-t border-emerald-900/50">
                          <span className="text-emerald-400 font-semibold">Monthly savings</span>
                          <span className="text-emerald-400 font-bold">
                            ${(currentMonthly - optimizedPlan.monthlyTotal).toFixed(2)}
                            <span className="text-emerald-700 font-normal"> · ${((currentMonthly - optimizedPlan.monthlyTotal) * 12).toFixed(0)}/yr</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Apply */}
            {step === 3 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">Apply Changes</h2>
                {applied ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-10"
                  >
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
                        <path d="M2 11L9.5 18.5L26 2" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-white font-bold text-xl">Changes Applied!</p>
                    <p className="text-zinc-400 text-sm mt-1">Your subscriptions have been updated.</p>
                    <button onClick={() => router.push('/dashboard')} className="mt-5 bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-zinc-100 transition">
                      Go to Dashboard →
                    </button>
                  </motion.div>
                ) : !optimizedPlan ? (
                  <p className="text-zinc-500 text-sm">Complete the previous steps first.</p>
                ) : (
                  <>
                    <div className="space-y-2 mb-6">
                      {SERVICES.map((svc) => {
                        const currentSub = activeSubs.find((s) => s.service === svc.id);
                        const isCurrentlyActive = !!currentSub;
                        const willBeActive = activeServiceIds.includes(svc.id);
                        const action = !isCurrentlyActive && willBeActive
                          ? 'activate'
                          : isCurrentlyActive && !willBeActive
                          ? 'cancel'
                          : 'nochange';
                        return (
                          <div
                            key={svc.id}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              action === 'activate'
                                ? 'bg-emerald-950/30 border-emerald-900/50'
                                : action === 'cancel'
                                ? 'bg-red-950/20 border-red-900/30'
                                : 'bg-zinc-900/40 border-zinc-800 opacity-50'
                            }`}
                          >
                            <span className="text-sm font-semibold" style={{ color: svc.brandColor }}>
                              {svc.name}
                            </span>
                            <span className={`text-xs font-medium ${
                              action === 'activate' ? 'text-emerald-400' : action === 'cancel' ? 'text-red-400' : 'text-zinc-600'
                            }`}>
                              {action === 'activate' ? '+ Activate' : action === 'cancel' ? '− Cancel' : 'No change'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={applyChanges}
                      disabled={!!applyLoading}
                      className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-all text-sm"
                    >
                      {applyLoading ? 'Applying…' : 'Apply All Changes'}
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Step nav */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700 transition"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 bg-white text-black font-bold py-2.5 rounded-xl text-sm hover:bg-zinc-100 transition"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
