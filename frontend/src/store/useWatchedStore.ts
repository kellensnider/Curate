import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WatchedState {
  /** Show ids the user has marked as watched. */
  watchedIds: string[];
  markWatched: (showId: string) => void;
  unmarkWatched: (showId: string) => void;
  isWatched: (showId: string) => boolean;
}

export const useWatchedStore = create<WatchedState>()(
  persist(
    (set, get) => ({
      watchedIds: [],

      markWatched: (showId) =>
        set((state) =>
          state.watchedIds.includes(showId)
            ? state
            : { watchedIds: [...state.watchedIds, showId] },
        ),

      unmarkWatched: (showId) =>
        set((state) => ({
          watchedIds: state.watchedIds.filter((id) => id !== showId),
        })),

      isWatched: (showId) => get().watchedIds.includes(showId),
    }),
    { name: 'curate-watched' },
  ),
);
