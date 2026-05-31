import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Show } from '../lib/mockData';

interface WatchedState {
  watchedIds: string[];
  watchedShows: Show[];
  markWatched: (show: Show) => void;
  unmarkWatched: (showId: string) => void;
  isWatched: (showId: string) => boolean;
}

export const useWatchedStore = create<WatchedState>()(
  persist(
    (set, get) => ({
      watchedIds: [],
      watchedShows: [],

      markWatched: (show) =>
        set((state) =>
          state.watchedIds.includes(show.id)
            ? state
            : {
                watchedIds: [...state.watchedIds, show.id],
                watchedShows: [...state.watchedShows, show],
              },
        ),

      unmarkWatched: (showId) =>
        set((state) => ({
          watchedIds: state.watchedIds.filter((id) => id !== showId),
          watchedShows: state.watchedShows.filter((s) => s.id !== showId),
        })),

      isWatched: (showId) => get().watchedIds.includes(showId),
    }),
    { name: 'curate-watched' },
  ),
);
