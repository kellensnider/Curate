import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  /** Most the user is willing to spend per month, in dollars. */
  maxMonthlyCost: number;
  /** Most simultaneous subscriptions (purchases) the user wants to juggle. */
  maxSubscriptions: number;
  setMaxMonthlyCost: (value: number) => void;
  setMaxSubscriptions: (value: number) => void;
}

export const DEFAULT_MAX_MONTHLY_COST = 30;
export const DEFAULT_MAX_SUBSCRIPTIONS = 2;

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      maxMonthlyCost: DEFAULT_MAX_MONTHLY_COST,
      maxSubscriptions: DEFAULT_MAX_SUBSCRIPTIONS,
      setMaxMonthlyCost: (value) => set({ maxMonthlyCost: value }),
      setMaxSubscriptions: (value) => set({ maxSubscriptions: value }),
    }),
    { name: 'curate-preferences' },
  ),
);
