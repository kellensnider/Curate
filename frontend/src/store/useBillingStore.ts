import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BillingEntry {
  service: string;
  renewalDate: string; // ISO date string (YYYY-MM-DD)
  monthlyCost: number;
}

interface BillingState {
  entries: Record<string, BillingEntry>;
  setEntry: (service: string, renewalDate: string, monthlyCost: number) => void;
  clearEntry: (service: string) => void;
  getDaysUntilRenewal: (service: string) => number | null;
}

export const useBillingStore = create<BillingState>()(
  persist(
    (set, get) => ({
      entries: {},

      setEntry: (service, renewalDate, monthlyCost) =>
        set((state) => ({
          entries: { ...state.entries, [service]: { service, renewalDate, monthlyCost } },
        })),

      clearEntry: (service) =>
        set((state) => {
          const next = { ...state.entries };
          delete next[service];
          return { entries: next };
        }),

      getDaysUntilRenewal: (service) => {
        const entry = get().entries[service];
        if (!entry) return null;
        const diff = new Date(entry.renewalDate).getTime() - Date.now();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
      },
    }),
    { name: 'curate-billing' },
  ),
);
