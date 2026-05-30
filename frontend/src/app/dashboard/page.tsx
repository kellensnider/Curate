'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SERVICES, planFromOptionIds, getOptionById } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import PlanBuilder from '../../components/subscriptions/PlanBuilder';
import CostCalculator from '../../components/subscriptions/CostCalculator';
import OptimizationSummary from '../../components/subscriptions/OptimizationSummary';
import WatchBeforeRenewal from '../../components/subscriptions/WatchBeforeRenewal';
import AgentChat from '../../components/agent/AgentChat';
import PipelineProgress, { type PipelineStep } from '../../components/pipeline/PipelineProgress';
import Navbar from '../../components/navigation/Navbar';

export default function DashboardPage() {
  const router = useRouter();
  const [showAgent, setShowAgent] = useState(false);

  const { watchlist, watchlistLoading, fetchWatchlist, watchlistAsShows } = useShowStore();
  const {
    subscriptions,
    optimizedPlan,
    selectedPlan,
    loading: subsLoading,
    fetchSubscriptions,
    fetchPrices,
    runOptimization,
    selectPlan,
  } = useSubscriptionStore();

  const [pipeline, setPipeline] = useState<PipelineStep[]>([
    { label: 'Load watchlist', status: 'idle' },
    { label: 'Load subscriptions', status: 'idle' },
    { label: 'Analyze coverage', status: 'idle' },
    { label: 'Compute plan', status: 'idle' },
  ]);

  function pipeSet(i: number, status: PipelineStep['status']) {
    setPipeline((prev) => prev.map((s, idx) => (idx === i ? { ...s, status } : s)));
  }

  useEffect(() => {
    (async () => {
      pipeSet(0, 'loading');
      await fetchWatchlist();
      pipeSet(0, 'done');

      pipeSet(1, 'loading');
      await fetchSubscriptions();
      await fetchPrices();
      pipeSet(1, 'done');

      pipeSet(2, 'loading');
      const shows = useShowStore.getState().watchlistAsShows();
      pipeSet(2, 'done');

      pipeSet(3, 'loading');
      if (shows.length > 0) runOptimization(shows);
      pipeSet(3, 'done');
    })();
  }, []);

  const plan = optimizedPlan;
  const watchlistShows = watchlistAsShows();
  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  const allDone = pipeline.every((s) => s.status === 'done');

  // The user's current (editable) selection — defaults to the optimal plan.
  const current = selectedPlan ?? optimizedPlan;
  const selectedOptionIds = current?.purchases.map((p) => p.id) ?? [];

  function toggleOption(id: string) {
    const opt = getOptionById(id);
    let next: string[];
    if (selectedOptionIds.includes(id)) {
      next = selectedOptionIds.filter((x) => x !== id);
    } else {
      next = [...selectedOptionIds, id];
      // Adding a bundle supersedes its individual constituent services.
      if (opt?.isBundle) {
        next = next.filter((x) => {
          const o = getOptionById(x);
          return o ? o.isBundle || !opt.services.includes(o.id) : true;
        });
      }
    }
    selectPlan(planFromOptionIds(next, watchlistShows.map((s) => s.id), watchlistShows));
  }

  function useRecommended() {
    selectPlan(optimizedPlan);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Pipeline progress */}
        <div className="mb-6">
          <PipelineProgress steps={pipeline} />
        </div>

        {/* Optimization banner */}
        {plan && allDone && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <OptimizationSummary result={plan} showCount={watchlistShows.length} />
          </motion.div>
        )}

        {/* No watchlist state */}
        {allDone && watchlistShows.length === 0 && (
          <div className="mb-6 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
            <p className="text-zinc-400 text-sm mb-3">
              Your watchlist is empty — add shows to get an optimized plan.
            </p>
            <button
              onClick={() => router.push('/browse')}
              className="bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-zinc-100 transition"
            >
              Browse Shows →
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive plan builder */}
          <div className="lg:col-span-2 space-y-4">
            {plan && current ? (
              <PlanBuilder
                watchlistShows={watchlistShows}
                recommended={plan}
                custom={current}
                selectedIds={selectedOptionIds}
                onToggle={toggleOption}
                onUseRecommended={useRecommended}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SERVICES.map((s) => (
                  <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse h-28" />
                ))}
              </div>
            )}

            {/* Watch before renewal */}
            <WatchBeforeRenewal />

            {/* Agent Chat */}
            <div>
              <button
                onClick={() => setShowAgent((v) => !v)}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-3"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                {showAgent ? 'Hide' : 'Open'} Curate AI
              </button>
              {showAgent && <AgentChat />}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {current ? (
              <CostCalculator result={current} />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse h-52" />
            )}

            <button
              onClick={() => router.push('/confirm')}
              disabled={!plan}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-100 active:scale-95 disabled:opacity-40 transition-all text-sm"
            >
              Confirm My Plan →
            </button>

            <button
              onClick={() => router.push('/audit')}
              className="w-full bg-zinc-800 text-zinc-300 font-medium py-3 rounded-xl hover:bg-zinc-700 transition text-sm"
            >
              Full Audit Wizard →
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full text-zinc-600 text-sm py-2 hover:text-zinc-400 transition-colors"
            >
              ← Change my shows
            </button>

            {/* Current subscription costs */}
            {activeSubs.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">
                  Current Spend
                </p>
                {activeSubs.map((sub) => {
                  const svc = SERVICES.find((s) => s.id === sub.service);
                  return (
                    <div key={sub.service} className="flex justify-between py-1">
                      <span className="text-xs text-zinc-400">{sub.displayName}</span>
                      <span className="text-xs text-zinc-300">${sub.monthlyCost.toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-zinc-800 mt-2 pt-2 flex justify-between">
                  <span className="text-xs text-zinc-400">Total</span>
                  <span className="text-xs text-white font-bold">
                    ${activeSubs.reduce((s, sub) => s + sub.monthlyCost, 0).toFixed(2)}/mo
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
