'use client';

import { useEffect, useState } from 'react';
import ServiceCard from '../components/ServiceCard';
import { getSubscriptions, activateSubscription, cancelSubscription } from '../lib/api';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loadingService, setLoadingService] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data.subscriptions);
      setMonthlyTotal(data.monthly_total);
    } catch {
      setError('Could not reach backend — is it running on port 3001?');
    }
  }

  useEffect(() => { load(); }, []);

  async function handleActivate(service) {
    setLoadingService(service);
    await activateSubscription(service);
    await load();
    setLoadingService(null);
  }

  async function handleCancel(service) {
    setLoadingService(service);
    await cancelSubscription(service);
    await load();
    setLoadingService(null);
  }

  const active = subscriptions.filter(s => s.status === 'active');
  const inactive = subscriptions.filter(s => s.status !== 'active');

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Curate</h1>
        <p className="text-gray-400 mt-1">Manage your streaming subscriptions</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Monthly spend summary */}
      <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">Monthly spend</div>
          <div className="text-2xl font-bold text-white">${monthlyTotal.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Active services</div>
          <div className="text-2xl font-bold text-white">{active.length}</div>
        </div>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Active
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {active.map(sub => (
              <ServiceCard
                key={sub.service}
                {...sub}
                loading={loadingService === sub.service}
                onActivate={handleActivate}
                onCancel={handleCancel}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available */}
      {inactive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Available
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {inactive.map(sub => (
              <ServiceCard
                key={sub.service}
                {...sub}
                loading={loadingService === sub.service}
                onActivate={handleActivate}
                onCancel={handleCancel}
              />
            ))}
          </div>
        </section>
      )}

      {subscriptions.length === 0 && !error && (
        <div className="text-center text-gray-600 py-20">Loading...</div>
      )}
    </main>
  );
}
