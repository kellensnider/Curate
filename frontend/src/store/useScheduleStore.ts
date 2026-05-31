import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** First day of next month, as an ISO date string (YYYY-MM-DD). */
export function firstOfNextMonth(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}

interface ScheduleState {
  /** Plan-option ids (services + bundles) scheduled to take effect next month. */
  optionIds: string[] | null;
  /** ISO date the scheduled change takes effect. */
  effectiveDate: string | null;
  /** ISO timestamp the schedule was created. */
  scheduledAt: string | null;
  setSchedule: (optionIds: string[]) => void;
  clearSchedule: () => void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      optionIds: null,
      effectiveDate: null,
      scheduledAt: null,

      setSchedule: (optionIds) =>
        set({
          optionIds,
          effectiveDate: firstOfNextMonth(),
          scheduledAt: new Date().toISOString(),
        }),

      clearSchedule: () =>
        set({ optionIds: null, effectiveDate: null, scheduledAt: null }),
    }),
    { name: 'curate-schedule' },
  ),
);
