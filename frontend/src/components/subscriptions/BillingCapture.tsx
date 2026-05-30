'use client';

import { useState } from 'react';
import { useBillingStore } from '../../store/useBillingStore';
import { SERVICES } from '../../lib/mockData';
import type { BackendSubscription } from '../../lib/api';

interface BillingCaptureProps {
  activeSubscriptions: BackendSubscription[];
}

export default function BillingCapture({ activeSubscriptions }: BillingCaptureProps) {
  const { entries, setEntry, clearEntry, getDaysUntilRenewal } = useBillingStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState('');

  function startEdit(service: string) {
    setEditing(service);
    setDateInput(entries[service]?.renewalDate ?? '');
  }

  function saveEntry(sub: BackendSubscription) {
    if (!dateInput) return;
    setEntry(sub.service, dateInput, sub.monthlyCost);
    setEditing(null);
  }

  if (activeSubscriptions.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <p className="text-zinc-600 text-sm">No active subscriptions to configure.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
        Billing Cadence
      </p>
      <div className="space-y-3">
        {activeSubscriptions.map((sub) => {
          const svc = SERVICES.find((s) => s.id === sub.service);
          const entry = entries[sub.service];
          const days = getDaysUntilRenewal(sub.service);
          const isEditing = editing === sub.service;

          return (
            <div key={sub.service} className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: svc?.brandColor ?? '#666' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {sub.displayName}
                </p>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="text-xs bg-zinc-800 border border-zinc-700 text-white px-2 py-1 rounded-lg focus:outline-none focus:border-zinc-500"
                    />
                    <button
                      onClick={() => saveEntry(sub)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {entry ? (
                      <span>
                        Renews {new Date(entry.renewalDate).toLocaleDateString()}{' '}
                        {days !== null && (
                          <span
                            className={
                              days <= 7
                                ? 'text-red-400'
                                : days <= 14
                                ? 'text-amber-400'
                                : 'text-zinc-500'
                            }
                          >
                            ({days <= 0 ? 'today' : `in ${days}d`})
                          </span>
                        )}
                      </span>
                    ) : (
                      'No renewal date set'
                    )}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => startEdit(sub.service)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {entry ? 'Edit' : 'Set date'}
                </button>
                {entry && !isEditing && (
                  <button
                    onClick={() => clearEntry(sub.service)}
                    className="text-xs text-zinc-700 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
