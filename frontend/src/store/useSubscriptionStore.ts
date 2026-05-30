import { create } from 'zustand';
import { OptimizationResult, optimizeSubscriptions } from '../lib/mockData';

interface SubscriptionState {
  optimizedPlan: OptimizationResult | null;
  confirmed: boolean;
  runOptimization: (selectedShowIds: string[]) => void;
  confirmPlan: () => void;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  optimizedPlan: null,
  confirmed: false,

  runOptimization: (selectedShowIds) =>
    set({ optimizedPlan: optimizeSubscriptions(selectedShowIds), confirmed: false }),

  confirmPlan: () => set({ confirmed: true }),

  reset: () => set({ optimizedPlan: null, confirmed: false }),
}));
