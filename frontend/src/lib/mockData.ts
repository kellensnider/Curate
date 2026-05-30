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

export interface OptimizationResult {
  requiredServices: Service[];
  monthlyTotal: number;
  monthlySavings: number;
  coverageMap: Record<string, string[]>;
  coverage: Record<string, string[]>;
}

export const SERVICES: Service[] = [
  { id: 'netflix', name: 'Netflix', monthlyPrice: 15.49, brandColor: '#E50914', logo: 'NETFLIX' },
  { id: 'disney', name: 'Disney+', monthlyPrice: 13.99, brandColor: '#113CCF', logo: 'DISNEY+' },
  { id: 'hulu', name: 'Hulu', monthlyPrice: 17.99, brandColor: '#1CE783', logo: 'HULU' },
  { id: 'max', name: 'Max', monthlyPrice: 15.99, brandColor: '#8B5CF6', logo: 'MAX' },
  { id: 'appletv', name: 'Apple TV+', monthlyPrice: 9.99, brandColor: '#F5F5F7', logo: 'APPLE TV+' },
  { id: 'peacock', name: 'Peacock', monthlyPrice: 7.99, brandColor: '#FFD700', logo: 'PEACOCK' },
  { id: 'paramount', name: 'Paramount+', monthlyPrice: 7.99, brandColor: '#0064FF', logo: 'PARAMOUNT+' },
  { id: 'prime', name: 'Prime Video', monthlyPrice: 8.99, brandColor: '#00A8E1', logo: 'PRIME' },
];

export const SHOWS: Show[] = (catalogData as Show[])
  .filter((show) => Boolean(show.id && show.title && show.posterUrl))
  .map((show) => ({
    ...show,
    genres: show.genres || [],
    streamingServices: show.streamingServices || [],
  }));

export const ALL_SERVICES_TOTAL = SERVICES.reduce((sum, service) => sum + service.monthlyPrice, 0);

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

export function optimizeSubscriptions(
  selectedShowIds: string[],
  pool: Show[] = SHOWS
): OptimizationResult {
  if (selectedShowIds.length === 0) {
    return {
      requiredServices: [],
      monthlyTotal: 0,
      monthlySavings: ALL_SERVICES_TOTAL,
      coverageMap: {},
      coverage: {},
    };
  }

  const selectedShows = pool.filter((show) => selectedShowIds.includes(show.id));
  const serviceCoverage = Object.fromEntries(
    SERVICES.map((service) => [service.id, [] as string[]])
  );

  for (const show of selectedShows) {
    for (const serviceId of show.streamingServices) {
      serviceCoverage[serviceId]?.push(show.id);
    }
  }

  const rankedServices = SERVICES
    .map((service) => ({
      service,
      coveredIds: serviceCoverage[service.id] ?? [],
    }))
    .filter((entry) => entry.coveredIds.length > 0)
    .sort((a, b) => {
      const coverageDelta = b.coveredIds.length - a.coveredIds.length;
      if (coverageDelta !== 0) return coverageDelta;
      return a.service.monthlyPrice - b.service.monthlyPrice;
    });

  const requiredServices = chooseBestServices(selectedShows, rankedServices);
  const coverageMap: Record<string, string[]> = {};

  for (const show of selectedShows) {
    coverageMap[show.id] = show.streamingServices.filter((serviceId) =>
      requiredServices.some((service) => service.id === serviceId)
    );
  }

  const monthlyTotal = requiredServices.reduce((sum, service) => sum + service.monthlyPrice, 0);
  const monthlySavings = Math.max(0, ALL_SERVICES_TOTAL - monthlyTotal);

  return {
    requiredServices,
    monthlyTotal,
    monthlySavings,
    coverageMap,
    coverage: serviceCoverage,
  };
}

function chooseBestServices(
  selectedShows: Show[],
  rankedServices: Array<{ service: Service; coveredIds: string[] }>
): Service[] {
  if (selectedShows.length === 0) return [];
  if (rankedServices.length <= 2) return rankedServices.map((entry) => entry.service);

  const selectedIds = new Set(selectedShows.map((show) => show.id));
  let bestPair: Service[] = [];
  let bestCovered = -1;
  let bestCost = Number.POSITIVE_INFINITY;

  for (let i = 0; i < rankedServices.length; i++) {
    for (let j = i; j < rankedServices.length; j++) {
      const pair = [rankedServices[i].service];
      if (j !== i) pair.push(rankedServices[j].service);

      const covered = new Set<string>();
      for (const service of pair) {
        const entry = rankedServices.find((ranked) => ranked.service.id === service.id);
        for (const showId of entry?.coveredIds ?? []) {
          covered.add(showId);
        }
      }

      const coveredCount = Array.from(covered).filter((id) => selectedIds.has(id)).length;
      const cost = pair.reduce((sum, service) => sum + service.monthlyPrice, 0);

      if (coveredCount > bestCovered || (coveredCount === bestCovered && cost < bestCost)) {
        bestPair = pair;
        bestCovered = coveredCount;
        bestCost = cost;
      }
    }
  }

  return bestPair;
}
