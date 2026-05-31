import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BillingCycle = 'monthly' | 'annual';

export interface BillingEntry {
  service: string;
  /** ISO date string (YYYY-MM-DD) of the next renewal / end of paid term. */
  renewalDate: string;
  /** The amount billed each cycle (monthly amount, or full annual amount). */
  monthlyCost: number;
  /** Whether this subscription bills monthly or annually. */
  cycle: BillingCycle;
}

interface BillingState {
  entries: Record<string, BillingEntry>;
  setEntry: (
    service: string,
    renewalDate: string,
    monthlyCost: number,
    cycle?: BillingCycle,
  ) => void;
  clearEntry: (service: string) => void;
  getDaysUntilRenewal: (service: string) => number | null;
  /** Whole months remaining until renewal (useful for annual plans). */
  getMonthsUntilRenewal: (service: string) => number | null;
}

export const useBillingStore = create<BillingState>()(
  persist(
    (set, get) => ({
      entries: {},

      setEntry: (service, renewalDate, monthlyCost, cycle = 'monthly') =>
        set((state) => ({
          entries: {
            ...state.entries,
            [service]: { service, renewalDate, monthlyCost, cycle },
          },
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

      getMonthsUntilRenewal: (service) => {
        const days = get().getDaysUntilRenewal(service);
        if (days === null) return null;
        return Math.max(0, Math.round(days / 30));
      },
    }),
    { name: 'curate-billing' },
  ),
);
