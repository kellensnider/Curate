import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  /** Emails of accounts that have completed first-run onboarding. */
  completedEmails: string[];
  markComplete: (email: string) => void;
  reset: (email: string) => void;
  isComplete: (email: string) => boolean;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedEmails: [],

      markComplete: (email) =>
        set((state) =>
          !email || state.completedEmails.includes(email)
            ? state
            : { completedEmails: [...state.completedEmails, email] },
        ),

      reset: (email) =>
        set((state) => ({
          completedEmails: state.completedEmails.filter((e) => e !== email),
        })),

      isComplete: (email) => !!email && get().completedEmails.includes(email),
    }),
    { name: 'curate-onboarding' },
  ),
);
