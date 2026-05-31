'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SERVICES,
  planFromOptionIds,
  getOptionById,
  type OptimizationResult,
} from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useBillingStore } from '../../store/useBillingStore';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useAuthStore } from '../../store/useAuthStore';
import PlanBuilder from '../../components/subscriptions/PlanBuilder';
import CostCalculator from '../../components/subscriptions/CostCalculator';
import BillingCapture from '../../components/subscriptions/BillingCapture';
import WatchThisMonth from '../../components/subscriptions/WatchThisMonth';
import MonthByMonthPlan from '../../components/subscriptions/MonthByMonthPlan';
import PipelineProgress, { type PipelineStep } from '../../components/pipeline/PipelineProgress';
import SubscriptionSetup from '../../components/automation/SubscriptionSetup';
import { useCreatedAccountsStore } from '../../store/useCreatedAccountsStore';
import Navbar from '../../components/navigation/Navbar';
import { calculateSubscriptionCost } from '../../lib/subscriptionCost';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, userName, accountPassword } = useAuthStore();

  const { fetchWatchlist, watchlistAsShows } = useShowStore();
  const {
    subscriptions,
    optimizedPlan,
    selectedPlan,
    watchPlan,
    fetchSubscriptions,
    fetchPrices,
    runOptimization,
    selectPlan,
    applyPlan,
  } = useSubscriptionStore();
  const { entries, getMonthsUntilRenewal } = useBillingStore();
  const { maxMonthlyCost, showsPerMonth } = usePreferencesStore();
  const {
    optionIds: scheduledIds,
    effectiveDate,
    setSchedule,
    clearSchedule,
  } = useScheduleStore();

  const [auditState, setAuditState] = useState<'idle' | 'running' | 'done'>(
    optimizedPlan ? 'done' : 'idle',
  );
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  // What the apply just changed — drives the post-apply AI account prompts.
  const [justActivated, setJustActivated] = useState<string[]>([]);
  const [justCancelled, setJustCancelled] = useState<string[]>([]);
  const createdAccounts = useCreatedAccountsStore((s) => s.created);
  const [pipeline, setPipeline] = useState<PipelineStep[]>([
    { label: 'Read watchlist', status: 'idle' },
    { label: 'Read subscriptions', status: 'idle' },
    { label: 'Analyze coverage', status: 'idle' },
    { label: 'Build next-month plan', status: 'idle' },
  ]);

  function pipeSet(i: number, status: PipelineStep['status']) {
    setPipeline((prev) => prev.map((s, idx) => (idx === i ? { ...s, status } : s)));
  }

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth?mode=signin');
      return;
    }
    fetchWatchlist();
    fetchSubscriptions();
    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchlistShows = watchlistAsShows();
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const activeServiceIds = activeSubs.map((s) => s.service);
  const infiniteServiceIds = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === 'active' && s.infiniteMembership)
        .map((s) => s.service),
    [subscriptions],
  );
  const currentMonthly = calculateSubscriptionCost(subscriptions);

  // The editable selection (defaults to the recommended plan after an audit).
  const current = selectedPlan ?? optimizedPlan;
  const selectedOptionIds = current?.purchases.map((p) => p.id) ?? [];
  const recommendationBaseline = useMemo(
    () => ({
      baselineMonthlyCost: current?.baselineMonthlyCost ?? optimizedPlan?.baselineMonthlyCost,
      baselineSubscriptions: current?.baselineSubscriptions ?? optimizedPlan?.baselineSubscriptions,
    }),
    [
      current?.baselineMonthlyCost,
      current?.baselineSubscriptions,
      optimizedPlan?.baselineMonthlyCost,
      optimizedPlan?.baselineSubscriptions,
    ],
  );

  // The scheduled next-month plan (persisted), if any.
  const scheduledPlan: OptimizationResult | null = useMemo(
    () =>
      scheduledIds
        ? planFromOptionIds(scheduledIds, watchlistShows.map((s) => s.id), watchlistShows, {
            infiniteServiceIds,
            ...recommendationBaseline,
          })
        : null,
    [scheduledIds, watchlistShows, infiniteServiceIds, recommendationBaseline],
  );

  // What the timeline treats as "next month": the schedule wins; otherwise the
  // current audit selection; otherwise no change from today.
  const plannedServiceIds = scheduledPlan
    ? scheduledPlan.requiredServices.map((s) => s.id)
    : auditState === 'done' && current
    ? current.requiredServices.map((s) => s.id)
    : activeServiceIds;
  const protectedPlannedServiceIds = useMemo(
    () => Array.from(new Set([...plannedServiceIds, ...infiniteServiceIds])),
    [plannedServiceIds, infiniteServiceIds],
  );

  const isOptimal =
    !!optimizedPlan &&
    selectedOptionIds.length === optimizedPlan.purchases.length &&
    selectedOptionIds.every((id) => optimizedPlan.purchases.some((p) => p.id === id));

  // Does the current selection already match what's scheduled?
  const selectionMatchesSchedule =
    !!scheduledIds &&
    scheduledIds.length === selectedOptionIds.length &&
    selectedOptionIds.every((id) => scheduledIds.includes(id));

  function toggleOption(id: string) {
    setApplied(false);
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
    selectPlan(
      planFromOptionIds(next, watchlistShows.map((s) => s.id), watchlistShows, {
        infiniteServiceIds,
        ...recommendationBaseline,
      }),
    );
  }

  function useRecommended() {
    selectPlan(optimizedPlan);
  }

  async function handleStartAudit() {
    setApplied(false);
    setAuditState('running');
    setPipeline((p) => p.map((s) => ({ ...s, status: 'idle' as const })));

    pipeSet(0, 'loading');
    await fetchWatchlist();
    pipeSet(0, 'done');

    pipeSet(1, 'loading');
    await fetchSubscriptions();
    pipeSet(1, 'done');

    pipeSet(2, 'loading');
    await new Promise((r) => setTimeout(r, 450));
    pipeSet(2, 'done');

    pipeSet(3, 'loading');
    const shows = useShowStore.getState().watchlistAsShows();
    if (shows.length > 0) runOptimization(shows);
    await new Promise((r) => setTimeout(r, 350));
    pipeSet(3, 'done');

    setAuditState('done');
  }

  function handleSchedule() {
    if (selectedOptionIds.length === 0) return;
    setSchedule(selectedOptionIds);
  }

  // Services to flip to reach the chosen plan (schedule wins, else current selection).
  const planServiceIds = Array.from(
    new Set([
      ...((scheduledPlan ?? current)?.requiredServices.map((s) => s.id) ?? []),
      ...infiniteServiceIds,
    ]),
  );
  const toActivate = planServiceIds.filter((id) => !activeServiceIds.includes(id));
  const toCancel = activeServiceIds.filter(
    (id) => !planServiceIds.includes(id) && !infiniteServiceIds.includes(id),
  );
  const hasChanges = toActivate.length > 0 || toCancel.length > 0;

  // Apply the plan now. Subscription state is updated server-side; the AI agent
  // then prompts (below) to create the new accounts and cancel the dropped ones.
  async function applyNow() {
    if (!hasChanges) {
      setApplied(true);
      return;
    }
    setApplying(true);
    // Snapshot the change set so the post-apply prompts have a stable list
    // (activeServiceIds shifts once applied; the cancel prompt only covers
    // accounts Curate created, captured here so the list can't reshape mid-run).
    setJustActivated(toActivate);
    setJustCancelled(toCancel.filter((id) => createdAccounts.includes(id)));
    try {
      await applyPlan(toActivate, toCancel);
      if (scheduledIds) clearSchedule();
      setApplied(true);
    } finally {
      setApplying(false);
    }
  }

  // ─── Renewal rows (active/planned services + their billing cadence) ─────────
  type RowStatus = 'keep' | 'drop' | 'add';
  const rows = useMemo(() => {
    const ids = Array.from(
      new Set([...activeServiceIds, ...protectedPlannedServiceIds, ...Object.keys(entries)]),
    ).filter((id) => activeServiceIds.includes(id) || protectedPlannedServiceIds.includes(id));

    return ids
      .map((id) => {
        const svc = SERVICES.find((s) => s.id === id);
        const isActive = activeServiceIds.includes(id);
        const isPlanned = protectedPlannedServiceIds.includes(id);
        const isInfinite = infiniteServiceIds.includes(id);
        const entry = isInfinite ? undefined : entries[id];
        const monthsLeft = getMonthsUntilRenewal(id);
        const annual = !isInfinite && entry?.cycle === 'annual';

        const status: RowStatus = isActive && isPlanned ? 'keep' : isActive ? 'drop' : 'add';

        const covered = watchlistShows.filter((s) => s.streamingServices.includes(id));

        return { id, svc, status, annual, monthsLeft, entry, covered, isInfinite };
      })
      .sort((a, b) => {
        const order = { drop: 0, keep: 1, add: 2 };
        return order[a.status] - order[b.status];
      });
  }, [activeServiceIds, protectedPlannedServiceIds, infiniteServiceIds, entries, watchlistShows, getMonthsUntilRenewal]);

  const annualRows = rows.filter((r) => r.annual && r.monthsLeft !== null);

  return (
    <div className="min-h-screen" style={{ position: 'relative' }}>
      <Navbar />

      <div className="max-w-6xl mx-auto" style={{ paddingLeft: 24, paddingRight: 24, paddingBottom: 40 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6" style={{ paddingTop: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: 0 }}>
            {userName ? `Hi ${userName.split(' ')[0]} — ` : ''}Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4, marginBottom: 18 }}>
            Audit your plan, schedule next month, or apply changes now.
          </p>
        </motion.div>

        {/* What to watch this month — pinned to the top for quick check-ins */}
        {auditState === 'done' && watchPlan && watchPlan.months.length > 0 && (
          <WatchThisMonth month={watchPlan.months[0]} />
        )}

        {/* This-month summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <SummaryStat label="Active services" value={activeSubs.length.toString()} />
          <SummaryStat label="Monthly spend" value={`$${currentMonthly.toFixed(2)}`} />
          <SummaryStat label="Shows in list" value={watchlistShows.length.toString()} />
          <SummaryStat label="Budget · pace" value={`$${maxMonthlyCost} · ${showsPerMonth}/mo`} small />
        </div>

        {/* Set up current subscriptions prompt */}
        {activeSubs.length === 0 && (
          <Link
            href="/subscriptions"
            className="flex items-center justify-between gap-3 mb-8 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition"
          >
            <div>
              <p className="text-white font-semibold text-sm">Add your current subscriptions</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Tell Curate what you already pay for and how long each lasts.
              </p>
            </div>
            <span className="text-zinc-400 text-sm shrink-0">Set up →</span>
          </Link>
        )}

        {/* Scheduled banner */}
        <AnimatePresence>
          {scheduledPlan && effectiveDate && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                marginBottom: 24,
                background: 'rgba(55,138,221,0.1)',
                border: '0.5px solid rgba(55,138,221,0.22)',
                borderRadius: 10,
                padding: '11px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'nowrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#378ADD',
                    flexShrink: 0,
                  }}
                />
                <p style={{ fontSize: 13, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ color: 'white', fontWeight: 600 }}>Scheduled for next month</span>
                  <span style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {' '}·{' '}{scheduledPlan.purchases.map((p) => p.name).join(' + ') || 'no services'} · takes effect {new Date(effectiveDate).toLocaleDateString()}
                  </span>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 12 }}>
                <button
                  onClick={applyNow}
                  disabled={applying}
                  style={{
                    fontSize: 13,
                    color: '#378ADD',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    opacity: applying ? 0.5 : 1,
                  }}
                >
                  {applying ? 'Applying…' : 'Apply now'}
                </button>
                <button
                  onClick={clearSchedule}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Audit ─────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Monthly Audit</h2>
            <button
              onClick={handleStartAudit}
              disabled={auditState === 'running' || watchlistShows.length === 0}
              className="bg-white text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-zinc-200 active:scale-95 disabled:opacity-40 transition-all"
            >
              {auditState === 'running'
                ? 'Auditing…'
                : auditState === 'done'
                ? 'Re-run Audit'
                : 'Start New Audit'}
            </button>
          </div>

          {watchlistShows.length === 0 && (
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <p className="text-zinc-400 text-sm mb-3">
                Add shows to your list, then run an audit to get next month&apos;s plan.
              </p>
              <button
                onClick={() => router.push('/browse')}
                className="bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-zinc-100 transition"
              >
                Browse Shows →
              </button>
            </div>
          )}

          {auditState !== 'idle' && watchlistShows.length > 0 && (
            <div className="mb-5">
              <PipelineProgress steps={pipeline} />
            </div>
          )}

          {/* Audit result: interactive builder + cost sidebar */}
          <AnimatePresence>
            {auditState === 'done' && optimizedPlan && current && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-2">
                  <PlanBuilder
                    watchlistShows={watchlistShows}
                    recommended={optimizedPlan}
                    custom={current}
                    selectedIds={selectedOptionIds}
                    onToggle={toggleOption}
                    onUseRecommended={useRecommended}
                  />
                </div>

                <div className="lg:col-span-1 space-y-3">
                  <CostCalculator result={current} />

                  {/* Schedule (non-destructive) */}
                  {selectionMatchesSchedule && effectiveDate ? (
                    <div className="w-full bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-4 text-center">
                      <p className="text-emerald-300 text-sm font-bold flex items-center justify-center gap-1.5">
                        <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                          <path d="M1 5.5L5 9.5L13 1.5" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Scheduled for next month
                      </p>
                      <p className="text-emerald-700 text-xs mt-1">
                        Takes effect {new Date(effectiveDate).toLocaleDateString()}
                      </p>
                      <button
                        onClick={clearSchedule}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors mt-2"
                      >
                        Cancel schedule
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleSchedule}
                        disabled={selectedOptionIds.length === 0}
                        className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-40 transition-all text-sm"
                      >
                        {scheduledIds ? 'Update schedule for next month' : 'Schedule for next month'}
                      </button>
                      <p className="text-xs text-zinc-500 text-center px-2">
                        Scheduling doesn&apos;t change anything today — it takes effect on the 1st.
                        {isOptimal ? '' : ' You picked a custom plan.'}
                      </p>
                    </>
                  )}

                  {/* Apply now — runs the MCP tool functions directly (no chat) */}
                  <div className="pt-1">
                    {applied && !hasChanges ? (
                      <p className="w-full flex items-center justify-center gap-1.5 text-sm text-emerald-400 font-semibold py-2">
                        <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                          <path d="M1 5.5L5 9.5L13 1.5" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Subscriptions updated
                      </p>
                    ) : (
                      <>
                        <button
                          onClick={applyNow}
                          disabled={applying || !hasChanges}
                          className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-40 transition-all text-sm"
                        >
                          {applying ? 'Applying…' : hasChanges ? 'Apply now' : 'No changes to apply'}
                        </button>
                        {hasChanges && (
                          <p className="text-xs text-zinc-500 text-center px-2 mt-2">
                            Runs immediately:{' '}
                            {toActivate.length > 0 && (
                              <span className="text-emerald-400">
                                +{toActivate.map((id) => SERVICES.find((s) => s.id === id)?.name ?? id).join(', ')}
                              </span>
                            )}
                            {toActivate.length > 0 && toCancel.length > 0 && ' · '}
                            {toCancel.length > 0 && (
                              <span className="text-red-400">
                                −{toCancel.map((id) => SERVICES.find((s) => s.id === id)?.name ?? id).join(', ')}
                              </span>
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ─── Multi-month plan ──────────────────────────────────────────── */}
        {auditState === 'done' && watchPlan && watchPlan.months.length > 0 && (
          <MonthByMonthPlan plan={watchPlan} infiniteServiceIds={infiniteServiceIds} />
        )}

        {/* After applying the plan: AI sets up the new accounts… */}
        {applied && justActivated.length > 0 && (
          <section className="mb-6">
            <SubscriptionSetup services={justActivated} password={accountPassword} action="subscribe" />
          </section>
        )}

        {/* …and cancels the dropped ones that Curate created (login + delete). */}
        {applied && justCancelled.length > 0 && (
          <section className="mb-10">
            <SubscriptionSetup services={justCancelled} password={accountPassword} action="unsubscribe" />
          </section>
        )}

        {/* ─── Renewals & billing ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-white">Renewals &amp; billing</h2>
            <Link href="/subscriptions" className="text-xs text-zinc-500 hover:text-zinc-300">
              Edit current subscriptions →
            </Link>
          </div>
          <p className="text-zinc-400 text-sm mb-4">
            When your current subscriptions renew, and what to finish before they lapse.
          </p>

          {/* Annual subscriptions with time left */}
          {annualRows.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Annual subscriptions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {annualRows.map((row) => (
                  <div
                    key={row.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold" style={{ color: row.svc?.brandColor }}>
                        {row.svc?.name ?? row.id}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Paid through{' '}
                        {row.entry ? new Date(row.entry.renewalDate).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-white">{row.monthsLeft}</p>
                      <p className="text-xs text-zinc-500">months left</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Watch-before lists */}
          {rows.filter((r) => (r.status === 'drop' || r.annual) && r.covered.length > 0).length > 0 && (
            <div className="mt-5 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Watch before they expire
              </h3>
              {rows
                .filter((r) => (r.status === 'drop' || r.annual) && r.covered.length > 0)
                .map((row) => (
                  <div key={row.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold" style={{ color: row.svc?.brandColor }}>
                        {row.svc?.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {row.annual && row.monthsLeft !== null
                          ? `${row.monthsLeft}mo left`
                          : 'Cancelling next month'}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {row.covered.slice(0, 10).map((show) => (
                        <div
                          key={show.id}
                          className="rounded-lg overflow-hidden"
                          style={{ width: 42, height: 63 }}
                          title={show.title}
                        >
                          <img
                            src={show.posterUrl}
                            alt={show.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {row.covered.length > 10 && (
                        <div
                          className="rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs"
                          style={{ width: 42, height: 63 }}
                        >
                          +{row.covered.length - 10}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Billing cadence editor */}
          <div className="mt-5">
            <BillingCapture activeSubscriptions={activeSubs} />
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        background: '#181818',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '12px 16px',
      }}
    >
      <p style={{ fontSize: small ? 16 : 20, fontWeight: 500, color: 'white', margin: 0 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: '4px 0 0' }}>{label}</p>
    </div>
  );
}
