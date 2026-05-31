import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  /** Most the user is willing to spend per month, in dollars. */
  maxMonthlyCost: number;
  /** Most simultaneous subscriptions (purchases) the user wants to juggle. */
  maxSubscriptions: number;
  /** How many titles the user can realistically finish in a month. */
  showsPerMonth: number;
  setMaxMonthlyCost: (value: number) => void;
  setMaxSubscriptions: (value: number) => void;
  setShowsPerMonth: (value: number) => void;
}

export const DEFAULT_MAX_MONTHLY_COST = 30;
export const DEFAULT_MAX_SUBSCRIPTIONS = 2;
export const DEFAULT_SHOWS_PER_MONTH = 4;

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      maxMonthlyCost: DEFAULT_MAX_MONTHLY_COST,
      maxSubscriptions: DEFAULT_MAX_SUBSCRIPTIONS,
      showsPerMonth: DEFAULT_SHOWS_PER_MONTH,
      setMaxMonthlyCost: (value) => set({ maxMonthlyCost: value }),
      setMaxSubscriptions: (value) => set({ maxSubscriptions: value }),
      setShowsPerMonth: (value) => set({ showsPerMonth: value }),
    }),
    { name: 'curate-preferences' },
  ),
);
