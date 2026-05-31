import { create } from 'zustand';
import type { Show } from '../lib/mockData';
import { optimizeSubscriptions, type OptimizationResult, SERVICES } from '../lib/mockData';
import type { BackendSubscription, ServicePrice } from '../lib/api';
import {
  getSubscriptions as apiGetSubs,
  getServicePrices as apiGetPrices,
  activateService as apiActivate,
  cancelService as apiCancel,
  applyPlan as apiApplyPlan,
} from '../lib/api';
import { usePreferencesStore } from './usePreferencesStore';

interface SubscriptionState {
  subscriptions: BackendSubscription[];
  prices: Record<string, ServicePrice>;
  monthlyTotal: number;
  loading: boolean;
  error: string | null;

  // Optimization results
  optimizedPlan: OptimizationResult | null; // the optimal recommendation (read-only reference)
  selectedPlan: OptimizationResult | null;  // what the user has chosen (defaults to optimal, editable)
  confirmed: boolean;

  // Actions
  fetchSubscriptions: () => Promise<void>;
  fetchPrices: () => Promise<void>;
  activate: (service: string) => Promise<void>;
  cancel: (service: string) => Promise<void>;
  applyPlan: (activate: string[], cancel: string[]) => Promise<void>;
  runOptimization: (shows: Show[]) => void;
  selectPlan: (plan: OptimizationResult | null) => void;
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
  selectedPlan: null,
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

  applyPlan: async (activate, cancel) => {
    await apiApplyPlan(activate, cancel);
    await get().fetchSubscriptions();
  },

  runOptimization: (shows) => {
    const ids = shows.map((s) => s.id);
    // Honor the user's Profile preferences (budget + subscription count).
    const { maxMonthlyCost, maxSubscriptions } = usePreferencesStore.getState();
    const plan = optimizeSubscriptions(ids, shows, {
      maxPurchases: maxSubscriptions,
      maxMonthlyCost,
    });
    // Default the user's selection to the optimal plan; they can edit from there.
    set({ optimizedPlan: plan, selectedPlan: plan, confirmed: false });
  },

  selectPlan: (plan) => set({ selectedPlan: plan, confirmed: false }),

  confirmPlan: () => set({ confirmed: true }),

  reset: () => set({ optimizedPlan: null, selectedPlan: null, confirmed: false }),
}));
