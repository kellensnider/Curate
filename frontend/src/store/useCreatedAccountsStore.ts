import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Tracks which streaming accounts Curate's agent created for the user, so that
 * when one of those subscriptions is later cancelled we can offer to log in and
 * delete the account we made (we only touch accounts we created).
 */
interface CreatedAccountsState {
  created: string[]; // service ids Curate created accounts for
  markCreated: (service: string) => void;
  unmarkCreated: (service: string) => void;
  wasCreated: (service: string) => boolean;
}

export const useCreatedAccountsStore = create<CreatedAccountsState>()(
  persist(
    (set, get) => ({
      created: [],
      markCreated: (service) =>
        set((s) => (s.created.includes(service) ? s : { created: [...s.created, service] })),
      unmarkCreated: (service) =>
        set((s) => ({ created: s.created.filter((x) => x !== service) })),
      wasCreated: (service) => get().created.includes(service),
    }),
    { name: 'curate-created-accounts' },
  ),
);
