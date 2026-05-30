import { create } from 'zustand';
import type { Show } from '../lib/mockData';
import { optimizeSubscriptions, type OptimizationResult, SERVICES } from '../lib/mockData';
import type { BackendSubscription, ServicePrice } from '../lib/api';
import {
  getSubscriptions as apiGetSubs,
  getServicePrices as apiGetPrices,
  activateService as apiActivate,
  cancelService as apiCancel,
} from '../lib/api';

interface SubscriptionState {
  subscriptions: BackendSubscription[];
  prices: Record<string, ServicePrice>;
  monthlyTotal: number;
  loading: boolean;
  error: string | null;

  // Local optimization result
  optimizedPlan: OptimizationResult | null;
  confirmed: boolean;

  // Actions
  fetchSubscriptions: () => Promise<void>;
  fetchPrices: () => Promise<void>;
  activate: (service: string) => Promise<void>;
  cancel: (service: string) => Promise<void>;
  runOptimization: (shows: Show[]) => void;
  confirmPlan: () => void;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  prices: {},
  monthlyTotal: 0,
  loading: false,
  error: null,
  optimizedPlan: null,
  confirmed: false,

  fetchSubscriptions: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiGetSubs();
      set({
        subscriptions: data.subscriptions,
        monthlyTotal: data.monthly_total,
        loading: false,
      });
    } catch {
      set({ loading: false, error: 'Could not load subscriptions' });
    }
  },

  fetchPrices: async () => {
    try {
      const prices = await apiGetPrices();
      set({ prices });
    } catch {
      /* fallback to SERVICES from mockData */
    }
  },

  activate: async (service) => {
    await apiActivate(service);
    await get().fetchSubscriptions();
  },

  cancel: async (service) => {
    await apiCancel(service);
    await get().fetchSubscriptions();
  },

  runOptimization: (shows) => {
    const ids = shows.map((s) => s.id);
    const plan = optimizeSubscriptions(ids, shows);
    set({ optimizedPlan: plan, confirmed: false });
  },

  confirmPlan: () => set({ confirmed: true }),

  reset: () => set({ optimizedPlan: null, confirmed: false }),
}));
