import { create } from 'zustand';
import { Show } from '../lib/mockData';

interface ShowState {
  selectedShowIds: string[];
  watchlist: Show[];
  toggleShow: (id: string) => void;
  addToWatchlist: (show: Show) => void;
  removeFromWatchlist: (id: string) => void;
  isSelected: (id: string) => boolean;
  clearSelection: () => void;
}

export const useShowStore = create<ShowState>((set, get) => ({
  selectedShowIds: [],
  watchlist: [],

  toggleShow: (id) =>
    set((state) => ({
      selectedShowIds: state.selectedShowIds.includes(id)
        ? state.selectedShowIds.filter((s) => s !== id)
        : [...state.selectedShowIds, id],
    })),

  addToWatchlist: (show) =>
    set((state) => ({
      watchlist: state.watchlist.some((s) => s.id === show.id)
        ? state.watchlist
        : [...state.watchlist, show],
    })),

  removeFromWatchlist: (id) =>
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s.id !== id),
    })),

  isSelected: (id) => get().selectedShowIds.includes(id),

  clearSelection: () => set({ selectedShowIds: [] }),
}));
