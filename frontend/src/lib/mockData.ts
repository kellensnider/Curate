export interface Show {
  id: string;
  title: string;
  posterUrl: string;
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
}

export const SERVICES: Service[] = [
  { id: 'netflix',   name: 'Netflix',       monthlyPrice: 15.99, brandColor: '#E50914', logo: 'NETFLIX' },
  { id: 'disney',    name: 'Disney+',       monthlyPrice: 13.99, brandColor: '#113CCF', logo: 'DISNEY+' },
  { id: 'hulu',      name: 'Hulu',          monthlyPrice: 17.99, brandColor: '#1CE783', logo: 'HULU' },
  { id: 'max',       name: 'Max',           monthlyPrice: 15.99, brandColor: '#002BE7', logo: 'MAX' },
  { id: 'appletv',   name: 'Apple TV+',     monthlyPrice: 9.99,  brandColor: '#F5F5F7', logo: 'APPLE TV+' },
  { id: 'peacock',   name: 'Peacock',       monthlyPrice: 7.99,  brandColor: '#FFD700', logo: 'PEACOCK' },
  { id: 'paramount', name: 'Paramount+',    monthlyPrice: 11.99, brandColor: '#0064FF', logo: 'PARAMOUNT+' },
  { id: 'prime',     name: 'Amazon Prime',  monthlyPrice: 8.99,  brandColor: '#00A8E1', logo: 'PRIME' },
];

export const ALL_SERVICES_TOTAL = SERVICES.reduce((sum, s) => sum + s.monthlyPrice, 0);

export const SHOWS: Show[] = [
  {
    id: 'stranger-things',
    title: 'Stranger Things',
    posterUrl: 'https://picsum.photos/seed/StrangerThings/300/450',
    genres: ['drama', 'sci-fi', 'thriller'],
    streamingServices: ['netflix'],
    year: 2016,
    rating: 8.7,
  },
  {
    id: 'the-last-of-us',
    title: 'The Last of Us',
    posterUrl: 'https://picsum.photos/seed/LastOfUs/300/450',
    genres: ['drama', 'action', 'sci-fi'],
    streamingServices: ['max'],
    year: 2023,
    rating: 8.8,
  },
  {
    id: 'wednesday',
    title: 'Wednesday',
    posterUrl: 'https://picsum.photos/seed/WednesdayShow/300/450',
    genres: ['comedy', 'thriller', 'drama'],
    streamingServices: ['netflix'],
    year: 2022,
    rating: 8.1,
  },
  {
    id: 'succession',
    title: 'Succession',
    posterUrl: 'https://picsum.photos/seed/Succession/300/450',
    genres: ['drama', 'comedy'],
    streamingServices: ['max'],
    year: 2018,
    rating: 8.9,
  },
  {
    id: 'ted-lasso',
    title: 'Ted Lasso',
    posterUrl: 'https://picsum.photos/seed/TedLasso/300/450',
    genres: ['comedy', 'drama', 'sports'],
    streamingServices: ['appletv'],
    year: 2020,
    rating: 8.8,
  },
  {
    id: 'the-bear',
    title: 'The Bear',
    posterUrl: 'https://picsum.photos/seed/TheBear/300/450',
    genres: ['drama', 'comedy'],
    streamingServices: ['hulu'],
    year: 2022,
    rating: 8.7,
  },
  {
    id: 'severance',
    title: 'Severance',
    posterUrl: 'https://picsum.photos/seed/Severance/300/450',
    genres: ['drama', 'sci-fi', 'thriller'],
    streamingServices: ['appletv'],
    year: 2022,
    rating: 8.7,
  },
  {
    id: 'andor',
    title: 'Andor',
    posterUrl: 'https://picsum.photos/seed/Andor/300/450',
    genres: ['action', 'sci-fi', 'drama'],
    streamingServices: ['disney'],
    year: 2022,
    rating: 8.4,
  },
  {
    id: 'house-of-the-dragon',
    title: 'House of the Dragon',
    posterUrl: 'https://picsum.photos/seed/HouseOfDragon/300/450',
    genres: ['drama', 'action', 'fantasy'],
    streamingServices: ['max'],
    year: 2022,
    rating: 8.5,
  },
  {
    id: 'only-murders',
    title: 'Only Murders in the Building',
    posterUrl: 'https://picsum.photos/seed/OnlyMurders/300/450',
    genres: ['comedy', 'thriller', 'drama'],
    streamingServices: ['hulu'],
    year: 2021,
    rating: 8.1,
  },
  {
    id: 'white-lotus',
    title: 'The White Lotus',
    posterUrl: 'https://picsum.photos/seed/WhiteLotus/300/450',
    genres: ['drama', 'comedy', 'thriller'],
    streamingServices: ['max'],
    year: 2021,
    rating: 8.0,
  },
  {
    id: 'abbott-elementary',
    title: 'Abbott Elementary',
    posterUrl: 'https://picsum.photos/seed/AbbottElementary/300/450',
    genres: ['comedy'],
    streamingServices: ['hulu', 'peacock'],
    year: 2021,
    rating: 8.2,
  },
  {
    id: 'yellowstone',
    title: 'Yellowstone',
    posterUrl: 'https://picsum.photos/seed/Yellowstone/300/450',
    genres: ['drama', 'action'],
    streamingServices: ['paramount'],
    year: 2018,
    rating: 8.7,
  },
  {
    id: 'shrinking',
    title: 'Shrinking',
    posterUrl: 'https://picsum.photos/seed/Shrinking/300/450',
    genres: ['comedy', 'drama'],
    streamingServices: ['appletv'],
    year: 2023,
    rating: 8.2,
  },
  {
    id: 'loki',
    title: 'Loki',
    posterUrl: 'https://picsum.photos/seed/LokiShow/300/450',
    genres: ['action', 'sci-fi', 'drama'],
    streamingServices: ['disney'],
    year: 2021,
    rating: 8.2,
  },
  {
    id: 'beef',
    title: 'Beef',
    posterUrl: 'https://picsum.photos/seed/BeefShow/300/450',
    genres: ['drama', 'comedy', 'thriller'],
    streamingServices: ['netflix'],
    year: 2023,
    rating: 8.3,
  },
  {
    id: 'the-crown',
    title: 'The Crown',
    posterUrl: 'https://picsum.photos/seed/TheCrown/300/450',
    genres: ['drama', 'documentary'],
    streamingServices: ['netflix'],
    year: 2016,
    rating: 8.7,
  },
  {
    id: 'emily-in-paris',
    title: 'Emily in Paris',
    posterUrl: 'https://picsum.photos/seed/EmilyInParis/300/450',
    genres: ['romance', 'comedy', 'drama'],
    streamingServices: ['netflix'],
    year: 2020,
    rating: 7.4,
  },
  {
    id: 'squid-game',
    title: 'Squid Game',
    posterUrl: 'https://picsum.photos/seed/SquidGame/300/450',
    genres: ['drama', 'thriller', 'action'],
    streamingServices: ['netflix'],
    year: 2021,
    rating: 8.0,
  },
  {
    id: 'euphoria',
    title: 'Euphoria',
    posterUrl: 'https://picsum.photos/seed/Euphoria/300/450',
    genres: ['drama', 'thriller'],
    streamingServices: ['max'],
    year: 2019,
    rating: 8.4,
  },
  {
    id: 'reacher',
    title: 'Reacher',
    posterUrl: 'https://picsum.photos/seed/Reacher/300/450',
    genres: ['action', 'thriller', 'drama'],
    streamingServices: ['prime'],
    year: 2022,
    rating: 8.0,
  },
  {
    id: 'the-boys',
    title: 'The Boys',
    posterUrl: 'https://picsum.photos/seed/TheBoys/300/450',
    genres: ['action', 'sci-fi', 'drama'],
    streamingServices: ['prime'],
    year: 2019,
    rating: 8.7,
  },
  {
    id: 'rings-of-power',
    title: 'Rings of Power',
    posterUrl: 'https://picsum.photos/seed/RingsOfPower/300/450',
    genres: ['action', 'fantasy', 'drama'],
    streamingServices: ['prime'],
    year: 2022,
    rating: 6.9,
  },
  {
    id: 'fleabag',
    title: 'Fleabag',
    posterUrl: 'https://picsum.photos/seed/Fleabag/300/450',
    genres: ['comedy', 'drama', 'romance'],
    streamingServices: ['prime'],
    year: 2016,
    rating: 8.7,
  },
  {
    id: 'peaky-blinders',
    title: 'Peaky Blinders',
    posterUrl: 'https://picsum.photos/seed/PeakyBlinders/300/450',
    genres: ['drama', 'action', 'thriller'],
    streamingServices: ['netflix'],
    year: 2013,
    rating: 8.8,
  },
  {
    id: 'dark',
    title: 'Dark',
    posterUrl: 'https://picsum.photos/seed/DarkShow/300/450',
    genres: ['sci-fi', 'thriller', 'drama'],
    streamingServices: ['netflix'],
    year: 2017,
    rating: 8.8,
  },
  {
    id: 'ozark',
    title: 'Ozark',
    posterUrl: 'https://picsum.photos/seed/Ozark/300/450',
    genres: ['drama', 'thriller', 'action'],
    streamingServices: ['netflix'],
    year: 2017,
    rating: 8.4,
  },
  {
    id: 'cobra-kai',
    title: 'Cobra Kai',
    posterUrl: 'https://picsum.photos/seed/CobraKai/300/450',
    genres: ['drama', 'action', 'comedy'],
    streamingServices: ['netflix'],
    year: 2018,
    rating: 8.5,
  },
  {
    id: 'station-eleven',
    title: 'Station Eleven',
    posterUrl: 'https://picsum.photos/seed/StationEleven/300/450',
    genres: ['drama', 'sci-fi', 'thriller'],
    streamingServices: ['max'],
    year: 2021,
    rating: 8.1,
  },
  {
    id: 'slow-horses',
    title: 'Slow Horses',
    posterUrl: 'https://picsum.photos/seed/SlowHorses/300/450',
    genres: ['drama', 'thriller'],
    streamingServices: ['appletv'],
    year: 2022,
    rating: 7.8,
  },
];

export const ALL_GENRES = ['All', 'Drama', 'Comedy', 'Sci-Fi', 'Thriller', 'Action', 'Romance', 'Fantasy', 'Documentary'];

export function getServiceById(id: string): Service | undefined {
  return SERVICES.find(s => s.id === id);
}

export function getShowById(id: string): Show | undefined {
  return SHOWS.find(s => s.id === id);
}

export function optimizeSubscriptions(
  selectedShowIds: string[],
  pool: Show[] = SHOWS,
): OptimizationResult {
  if (selectedShowIds.length === 0) {
    return {
      requiredServices: [],
      monthlyTotal: 0,
      monthlySavings: ALL_SERVICES_TOTAL,
      coverageMap: {},
    };
  }

  const selectedShows = pool.filter(s => selectedShowIds.includes(s.id));
  const uncovered = new Set<string>(selectedShowIds);
  const required: Service[] = [];

  // Greedy set cover
  while (uncovered.size > 0) {
    let bestService: Service | null = null;
    let bestCovered: string[] = [];

    for (const service of SERVICES) {
      if (required.some(r => r.id === service.id)) continue;
      const covered = selectedShows
        .filter(show => uncovered.has(show.id) && show.streamingServices.includes(service.id))
        .map(show => show.id);
      if (covered.length > bestCovered.length) {
        bestCovered = covered;
        bestService = service;
      }
    }

    if (!bestService || bestCovered.length === 0) break;
    required.push(bestService);
    bestCovered.forEach(id => uncovered.delete(id));
  }

  const coverageMap: Record<string, string[]> = {};
  for (const show of selectedShows) {
    coverageMap[show.id] = show.streamingServices.filter(s =>
      required.some(r => r.id === s)
    );
  }

  const monthlyTotal = required.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const monthlySavings = ALL_SERVICES_TOTAL - monthlyTotal;

  return { requiredServices: required, monthlyTotal, monthlySavings, coverageMap };
}
