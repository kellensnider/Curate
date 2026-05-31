import catalogData from './catalogData.json';

export interface Show {
  id: string;
  title: string;
  type: 'movie' | 'series';
  posterUrl: string;
  backdropUrl?: string;
  overview?: string;
  genres: string[];
  streamingServices: string[];
  year: number;
  rating: number;
}

export interface Service {
  id: string;
  name: string;
  monthlyPrice: number;
  brandColor: string;
  logo: string;
}

/** A purchasable plan: either a single service or a multi-service bundle. */
export interface PlanOption {
  id: string;
  name: string;
  monthlyPrice: number;
  /** Content service ids this purchase grants access to. */
  services: string[];
  isBundle: boolean;
}

export interface OptimizationResult {
  /** Flattened list of content services the plan grants (drives coverage UI). */
  requiredServices: Service[];
  /** What to actually buy — individual services and/or bundles. */
  purchases: PlanOption[];
  monthlyTotal: number;
  monthlySavings: number;
  /** Per-show: which of the plan's services cover it. */
  coverageMap: Record<string, string[]>;
  /** Per-service: which selected shows it covers (independent of the chosen plan). */
  coverage: Record<string, string[]>;
}

export const SERVICES: Service[] = [
  { id: 'netflix', name: 'Netflix', monthlyPrice: 15.49, brandColor: '#E50914', logo: 'NETFLIX' },
  { id: 'disney', name: 'Disney+', monthlyPrice: 13.99, brandColor: '#113CCF', logo: 'DISNEY+' },
  { id: 'hulu', name: 'Hulu', monthlyPrice: 17.99, brandColor: '#1CE783', logo: 'HULU' },
  { id: 'max', name: 'Max', monthlyPrice: 15.99, brandColor: '#8B5CF6', logo: 'MAX' },
  { id: 'peacock', name: 'Peacock', monthlyPrice: 7.99, brandColor: '#FFD700', logo: 'PEACOCK' },
  { id: 'paramount', name: 'Paramount+', monthlyPrice: 7.99, brandColor: '#0064FF', logo: 'PARAMOUNT+' },
  { id: 'prime', name: 'Prime Video', monthlyPrice: 8.99, brandColor: '#00A8E1', logo: 'PRIME' },
  { id: 'tubi', name: 'Tubi', monthlyPrice: 0, brandColor: '#7408FF', logo: 'TUBI' },
];

export const SHOWS: Show[] = (catalogData as Show[])
  .filter((show) => Boolean(show.id && show.title && show.posterUrl))
  .map((show) => ({
    ...show,
    genres: show.genres || [],
    streamingServices: show.streamingServices || [],
  }));

export const ALL_SERVICES_TOTAL = SERVICES.reduce((sum, service) => sum + service.monthlyPrice, 0);

/**
 * Multi-service bundles (with-ads tiers). A bundle is a single purchase that
 * grants access to several content services — often far better value than
 * buying those services individually. Mirrors the backend BUNDLES.
 */
export const BUNDLES: PlanOption[] = [
  { id: 'disney_hulu',     name: 'Disney+ & Hulu',      monthlyPrice: 12.99, services: ['disney', 'hulu'],        isBundle: true },
  { id: 'disney_hulu_max', name: 'Disney+, Hulu & Max', monthlyPrice: 19.99, services: ['disney', 'hulu', 'max'], isBundle: true },
];

/** Every purchasable option: each individual service plus every bundle. */
export const PLAN_OPTIONS: PlanOption[] = [
  ...SERVICES.map((s) => ({
    id: s.id,
    name: s.name,
    monthlyPrice: s.monthlyPrice,
    services: [s.id],
    isBundle: false,
  })),
  ...BUNDLES,
];

export const ALL_GENRES = [
  'All',
  ...Array.from(new Set(SHOWS.flatMap((show) => show.genres))).sort((a, b) =>
    a.localeCompare(b)
  ),
];

export function getServiceById(id: string): Service | undefined {
  return SERVICES.find((service) => service.id === id);
}

export function getShowById(id: string): Show | undefined {
  return SHOWS.find((show) => show.id === id);
}

export function getOptionById(id: string): PlanOption | undefined {
  return PLAN_OPTIONS.find((o) => o.id === id);
}

/** Number of selected shows a plan result covers (coverageMap entry non-empty). */
export function coveredShowCount(result: OptimizationResult): number {
  return Object.values(result.coverageMap).filter((svcs) => svcs.length > 0).length;
}

/** Per-service map of which selected shows each individual service covers. */
function buildServiceCoverage(selectedShows: Show[]): Record<string, string[]> {
  const coverage = Object.fromEntries(SERVICES.map((s) => [s.id, [] as string[]]));
  for (const show of selectedShows) {
    for (const serviceId of show.streamingServices) {
      coverage[serviceId]?.push(show.id);
    }
  }
  return coverage;
}

export interface OptimizeOptions {
  /**
   * Max number of *purchases* per month (the "1–2" rule). A bundle counts as a
   * single purchase even though it grants several services.
   */
  maxPurchases?: number;
  /**
   * Hard ceiling on the plan's monthly cost. Plans above this are excluded
   * (unless nothing fits, in which case the single cheapest option wins so the
   * user is never left with an empty plan).
   */
  maxMonthlyCost?: number;
}

// Enumerate every combination of `items` with size 1..max.
function combinations<T>(items: T[], max: number): T[][] {
  const out: T[][] = [];
  const recurse = (start: number, combo: T[]) => {
    if (combo.length > 0) out.push(combo);
    if (combo.length === max) return;
    for (let i = start; i < items.length; i++) {
      recurse(i + 1, [...combo, items[i]]);
    }
  };
  recurse(0, []);
  return out;
}

/**
 * Finds the optimal subscription plan by exhaustively comparing every
 * combination of purchasable options (individual services + bundles) up to
 * `maxPurchases`. Among all plans it maximizes rank-weighted show coverage,
 * then breaks ties toward the cheapest. Because it evaluates whole plans — not
 * one service at a time — it correctly prefers a bundle over two pricier
 * individual subscriptions when the bundle covers more for less.
 */
export function optimizeSubscriptions(
  selectedShowIds: string[],
  pool: Show[] = SHOWS,
  options: OptimizeOptions = {}
): OptimizationResult {
  const { maxPurchases = 2, maxMonthlyCost = Infinity } = options;

  if (selectedShowIds.length === 0) {
    return {
      requiredServices: [],
      purchases: [],
      monthlyTotal: 0,
      monthlySavings: ALL_SERVICES_TOTAL,
      coverageMap: {},
      coverage: {},
    };
  }

  // Preserve watchlist order (index 0 = rank 1 = most-wanted) and weight by rank,
  // so the plan favors covering the titles the user cares about most.
  const byId = new Map(pool.map((s) => [s.id, s]));
  const orderedShows = selectedShowIds
    .map((id) => byId.get(id))
    .filter((s): s is Show => Boolean(s));
  const n = orderedShows.length;
  const weightOf = new Map(orderedShows.map((s, i) => [s.id, n - i]));

  const scorePlan = (combo: PlanOption[]) => {
    const granted = new Set(combo.flatMap((o) => o.services));
    let weight = 0;
    for (const show of orderedShows) {
      if (show.streamingServices.some((s) => granted.has(s))) {
        weight += weightOf.get(show.id) ?? 0;
      }
    }
    const cost = combo.reduce((sum, o) => sum + o.monthlyPrice, 0);
    return { weight, cost };
  };

  let best: PlanOption[] = [];
  let bestScore = { weight: -1, cost: Infinity };

  for (const combo of combinations(PLAN_OPTIONS, maxPurchases)) {
    const { weight, cost } = scorePlan(combo);
    // Respect the user's monthly budget — never recommend a plan over it.
    if (cost > maxMonthlyCost) continue;
    // Skip plans containing an option that adds no coverage (pure dead weight).
    if (combo.length > 1) {
      const redundant = combo.some(
        (opt) => scorePlan(combo.filter((o) => o !== opt)).weight === weight
      );
      if (redundant) continue;
    }
    if (weight > bestScore.weight || (weight === bestScore.weight && cost < bestScore.cost)) {
      best = combo;
      bestScore = { weight, cost };
    }
  }

  // If the budget is so tight nothing qualified, fall back to the single
  // cheapest option that still covers something, so the plan is never empty.
  if (best.length === 0) {
    const fallback = PLAN_OPTIONS
      .filter((o) => scorePlan([o]).weight > 0)
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice)[0];
    if (fallback) best = [fallback];
  }

  const granted = new Set(best.flatMap((o) => o.services));
  const requiredServices = SERVICES.filter((s) => granted.has(s.id));

  const coverageMap: Record<string, string[]> = {};
  for (const show of orderedShows) {
    coverageMap[show.id] = show.streamingServices.filter((s) => granted.has(s));
  }

  const monthlyTotal = best.reduce((sum, o) => sum + o.monthlyPrice, 0);
  const monthlySavings = Math.max(0, ALL_SERVICES_TOTAL - monthlyTotal);

  return {
    requiredServices,
    purchases: best,
    monthlyTotal,
    monthlySavings,
    coverageMap,
    coverage: buildServiceCoverage(orderedShows),
  };
}

/**
 * Builds a plan result from an explicit set of chosen option ids (services
 * and/or bundles) — used when the user manually edits their plan. Mirrors the
 * shape of optimizeSubscriptions so the same UI can render either.
 */
export function planFromOptionIds(
  optionIds: string[],
  selectedShowIds: string[],
  pool: Show[] = SHOWS
): OptimizationResult {
  const purchases = PLAN_OPTIONS.filter((o) => optionIds.includes(o.id));
  const granted = new Set(purchases.flatMap((o) => o.services));
  const requiredServices = SERVICES.filter((s) => granted.has(s.id));

  const byId = new Map(pool.map((s) => [s.id, s]));
  const orderedShows = selectedShowIds
    .map((id) => byId.get(id))
    .filter((s): s is Show => Boolean(s));

  const coverageMap: Record<string, string[]> = {};
  for (const show of orderedShows) {
    coverageMap[show.id] = show.streamingServices.filter((s) => granted.has(s));
  }

  const monthlyTotal = purchases.reduce((sum, o) => sum + o.monthlyPrice, 0);
  const monthlySavings = Math.max(0, ALL_SERVICES_TOTAL - monthlyTotal);

  return {
    requiredServices,
    purchases,
    monthlyTotal,
    monthlySavings,
    coverageMap,
    coverage: buildServiceCoverage(orderedShows),
  };
}

/** One month of a multi-month watch plan. */
export interface MonthPlan {
  /** 0 = this month, 1 = next month, … */
  monthIndex: number;
  /** The optimal plan to subscribe to for this month's backlog. */
  plan: OptimizationResult;
  /** The titles to watch this month — the top `showsPerMonth` covered shows. */
  watch: Show[];
  /** How many watchlist titles remain unwatched after this month. */
  remainingAfter: number;
}

export interface WatchPlan {
  months: MonthPlan[];
  /** Sum of every month's plan cost (what finishing the list will cost). */
  totalCost: number;
  /** Titles scheduled to be watched across the whole plan. */
  totalShows: number;
  /** Months needed to clear the (coverable) watchlist, capped by the horizon. */
  monthsToFinish: number;
  /** Watchlist titles no affordable plan within the horizon ever reaches. */
  unreachable: Show[];
}

export interface MultiMonthOptions extends OptimizeOptions {
  /** Titles the user can finish per month (drives how fast the backlog clears). */
  showsPerMonth?: number;
  /** Hard cap on how many months ahead to plan. */
  horizon?: number;
  /** Already-watched titles to exclude from planning. */
  watchedIds?: string[];
}

/**
 * Plans several months ahead. Each month it finds the optimal plan for the
 * shows still on the watchlist, "watches" the top `showsPerMonth` titles that
 * plan covers (highest watchlist rank first), then recomputes next month with
 * those titles completed — so the recommended services naturally rotate as you
 * burn through each service's content. Mirrors `optimizeSubscriptions` per
 * month, so month 0's plan is exactly the single-month audit result.
 */
export function planMultiMonth(
  rankedShowIds: string[],
  pool: Show[] = SHOWS,
  options: MultiMonthOptions = {},
): WatchPlan {
  const {
    showsPerMonth = 4,
    maxPurchases = 2,
    maxMonthlyCost = Infinity,
    horizon = 6,
    watchedIds = [],
  } = options;

  const byId = new Map(pool.map((s) => [s.id, s]));
  const watched = new Set(watchedIds);
  // Ranked (most-wanted first), unwatched, resolvable titles.
  let remaining = rankedShowIds
    .filter((id) => !watched.has(id))
    .map((id) => byId.get(id))
    .filter((s): s is Show => Boolean(s));

  const months: MonthPlan[] = [];
  const perMonth = Math.max(1, Math.floor(showsPerMonth));

  while (remaining.length > 0 && months.length < horizon) {
    const plan = optimizeSubscriptions(
      remaining.map((s) => s.id),
      remaining,
      { maxPurchases, maxMonthlyCost },
    );
    const granted = new Set(plan.requiredServices.map((s) => s.id));
    const coveredThisMonth = remaining.filter((s) =>
      s.streamingServices.some((svc) => granted.has(svc)),
    );
    const watch = coveredThisMonth.slice(0, perMonth);
    // No covered titles means no affordable plan can make progress — stop.
    if (watch.length === 0) break;

    const watchedThisMonth = new Set(watch.map((s) => s.id));
    remaining = remaining.filter((s) => !watchedThisMonth.has(s.id));

    months.push({
      monthIndex: months.length,
      plan,
      watch,
      remainingAfter: remaining.length,
    });
  }

  return {
    months,
    totalCost: months.reduce((sum, m) => sum + m.plan.monthlyTotal, 0),
    totalShows: months.reduce((sum, m) => sum + m.watch.length, 0),
    monthsToFinish: months.length,
    // Whatever's left once we stop is unreachable within budget/horizon.
    unreachable: remaining,
  };
}
