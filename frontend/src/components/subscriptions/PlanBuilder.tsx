'use client';

import { motion } from 'framer-motion';
import {
  SERVICES,
  BUNDLES,
  getServiceById,
  coveredShowCount,
  type Show,
  type PlanOption,
  type OptimizationResult,
} from '../../lib/mockData';

interface PlanBuilderProps {
  watchlistShows: Show[];
  recommended: OptimizationResult; // optimal plan (reference)
  custom: OptimizationResult; // the user's current selection
  selectedIds: string[];
  onToggle: (id: string) => void;
  onUseRecommended: () => void;
}

export default function PlanBuilder({
  watchlistShows,
  recommended,
  custom,
  selectedIds,
  onToggle,
  onUseRecommended,
}: PlanBuilderProps) {
  const total = watchlistShows.length;
  const recommendedIds = recommended.purchases.map((p) => p.id);
  const isOptimal =
    selectedIds.length === recommendedIds.length &&
    selectedIds.every((id) => recommendedIds.includes(id));

  // How many watchlist shows a given option would cover.
  const optionCoverage = (opt: PlanOption) =>
    watchlistShows.filter((show) =>
      show.streamingServices.some((s) => opt.services.includes(s)),
    ).length;

  function OptionCard({ opt }: { opt: PlanOption }) {
    const selected = selectedIds.includes(opt.id);
    const recommendedPick = recommendedIds.includes(opt.id);
    const covers = optionCoverage(opt);
    const accent = opt.isBundle
      ? '#a855f7'
      : getServiceById(opt.services[0])?.brandColor ?? '#71717a';

    return (
      <motion.button
        type="button"
        onClick={() => onToggle(opt.id)}
        whileTap={{ scale: 0.97 }}
        className={`relative text-left p-4 rounded-xl border transition-all ${
          selected
            ? 'bg-zinc-900 border-2'
            : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
        }`}
        style={selected ? { borderColor: accent, boxShadow: `0 0 20px ${accent}22` } : {}}
      >
        {recommendedPick && (
          <span className="absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wide bg-emerald-500 text-black px-1.5 py-0.5 rounded">
            Recommended
          </span>
        )}
        <div className="flex items-start justify-between">
          <span
            className="text-xs font-black tracking-tight leading-tight pr-2"
            style={{ color: selected ? accent : '#71717a' }}
          >
            {opt.name}
            {opt.isBundle && <span className="block text-[10px] text-zinc-500 font-medium mt-0.5">Bundle</span>}
          </span>
          <span
            className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${
              selected ? 'border-transparent' : 'border-zinc-700'
            }`}
            style={selected ? { backgroundColor: accent } : {}}
          >
            {selected && (
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                <path d="M1 4.5L4 7.5L10 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </div>
        <p className="text-white font-bold mt-2">${opt.monthlyPrice.toFixed(2)}<span className="text-zinc-500 text-xs font-normal">/mo</span></p>
        <p className={`text-xs mt-0.5 ${covers > 0 ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Covers {covers} {covers === 1 ? 'show' : 'shows'}
        </p>
      </motion.button>
    );
  }

  return (
    <div className="space-y-5">
      {/* Comparison strip: your selection vs the optimal plan */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-2xl border p-4 ${isOptimal ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-900 border-blue-900/60'}`}>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-blue-400 mb-1">Your selection</p>
          <p className="text-2xl font-bold text-white tabular-nums">${custom.monthlyTotal.toFixed(2)}<span className="text-zinc-500 text-sm font-normal">/mo</span></p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {coveredShowCount(custom)}/{total} shows · {custom.purchases.length} purchase{custom.purchases.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400">Recommended</p>
            {!isOptimal && (
              <button
                onClick={onUseRecommended}
                className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
              >
                Use this
              </button>
            )}
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">${recommended.monthlyTotal.toFixed(2)}<span className="text-zinc-500 text-sm font-normal">/mo</span></p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {coveredShowCount(recommended)}/{total} shows · {recommended.purchases.map((p) => p.name).join(' + ') || 'none'}
          </p>
        </div>
      </div>

      {isOptimal ? (
        <p className="text-xs text-emerald-400/80 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> You&apos;re on the optimal plan.
        </p>
      ) : (
        <p className="text-xs text-blue-400/80 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Custom plan — tap options to adjust, or use the recommended one.
        </p>
      )}

      {/* Bundles */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Bundles · best value</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BUNDLES.map((b) => (
            <OptionCard key={b.id} opt={b} />
          ))}
        </div>
      </div>

      {/* Individual services */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Individual services</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SERVICES.map((s) => (
            <OptionCard
              key={s.id}
              opt={{ id: s.id, name: s.name, monthlyPrice: s.monthlyPrice, services: [s.id], isBundle: false }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
