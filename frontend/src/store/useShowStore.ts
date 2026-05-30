import { create } from 'zustand';
import type { Show } from '../lib/mockData';
import type { BackendWatchlistItem } from '../lib/api';
import {
  getPopularShows,
  searchShows as apiSearch,
  getWatchlist as apiGetWatchlist,
  addToWatchlist as apiAdd,
  removeFromWatchlist as apiRemove,
  adaptShow,
} from '../lib/api';

interface ShowState {
  // Browsing (API-fetched)
  browseShows: Show[];
  browseLoading: boolean;
  browseError: string | null;

  // Watchlist (API-fetched)
  watchlist: BackendWatchlistItem[];
  watchlistLoading: boolean;

  // Local selection for onboarding flow
  selectedShowIds: string[];

  // Actions
  fetchPopular: () => Promise<void>;
  searchShows: (q: string, genre?: string, service?: string) => Promise<void>;
  fetchWatchlist: () => Promise<void>;
  addShowToWatchlist: (showId: string) => Promise<void>;
  removeShowFromWatchlist: (showId: string) => Promise<void>;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  bulkAddSelectedToWatchlist: () => Promise<void>;

  // Derived helpers
  watchlistAsShows: () => Show[];
  isInWatchlist: (id: string) => boolean;
}

export const useShowStore = create<ShowState>((set, get) => ({
  browseShows: [],
  browseLoading: false,
  browseError: null,
  watchlist: [],
  watchlistLoading: false,
  selectedShowIds: [],

  fetchPopular: async () => {
    set({ browseLoading: true, browseError: null });
    try {
      const shows = await getPopularShows();
      set({ browseShows: shows.map(adaptShow), browseLoading: false });
    } catch {
      set({ browseLoading: false, browseError: 'Could not reach backend' });
    }
  },

  searchShows: async (q, genre, service) => {
    set({ browseLoading: true, browseError: null });
    try {
      const shows = await apiSearch(q, genre, service);
      set({ browseShows: shows.map(adaptShow), browseLoading: false });
    } catch {
      set({ browseLoading: false, browseError: 'Search failed' });
    }
  },

  fetchWatchlist: async () => {
    set({ watchlistLoading: true });
    try {
      const items = await apiGetWatchlist();
      set({ watchlist: items, watchlistLoading: false });
    } catch {
      set({ watchlistLoading: false });
    }
  },

  addShowToWatchlist: async (showId) => {
    try {
      await apiAdd(showId);
      await get().fetchWatchlist();
    } catch {
      /* 409 = already in list, ignore */
    }
  },

  removeShowFromWatchlist: async (showId) => {
    try {
      await apiRemove(showId);
      set((state) => ({
        watchlist: state.watchlist.filter((i) => i.show_id !== showId),
      }));
    } catch {
      /* ignore */
    }
  },

  toggleSelected: (id) =>
    set((state) => ({
      selectedShowIds: state.selectedShowIds.includes(id)
        ? state.selectedShowIds.filter((s) => s !== id)
        : [...state.selectedShowIds, id],
    })),

  clearSelected: () => set({ selectedShowIds: [] }),

  bulkAddSelectedToWatchlist: async () => {
    const { selectedShowIds } = get();
    for (const id of selectedShowIds) {
      try {
        await apiAdd(id);
      } catch {
        /* 409 = already there, fine */
      }
    }
    await get().fetchWatchlist();
    set({ selectedShowIds: [] });
  },

  watchlistAsShows: () =>
    get()
      .watchlist.slice()
      .sort((a, b) => a.rank - b.rank)
      .map((item) => adaptShow(item.show)),

  isInWatchlist: (id) =>
    get().watchlist.some((item) => item.show_id === id),
}));
