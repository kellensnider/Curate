'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SERVICES, SHOWS } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import ServiceCard from '../../components/subscriptions/ServiceCard';
import CostCalculator from '../../components/subscriptions/CostCalculator';
import OptimizationSummary from '../../components/subscriptions/OptimizationSummary';
import Navbar from '../../components/navigation/Navbar';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedShowIds } = useShowStore();
  const { optimizedPlan, runOptimization } = useSubscriptionStore();

  useEffect(() => {
    if (selectedShowIds.length > 0 && !optimizedPlan) {
      runOptimization(selectedShowIds);
    }
  }, []);

  if (selectedShowIds.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 pt-24 text-center">
          <p className="text-zinc-400 text-lg mb-4">No shows selected yet.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            Pick Your Shows
          </button>
        </div>
      </div>
    );
  }

  const plan = optimizedPlan;
  const activeServiceIds = plan?.requiredServices.map((s) => s.id) ?? [];
  const selectedShows = SHOWS.filter((s) => selectedShowIds.includes(s.id));

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Optimization banner */}
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <OptimizationSummary result={plan} showCount={selectedShows.length} />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service cards */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              {SERVICES.map((service, i) => {
                const isActive = activeServiceIds.includes(service.id);
                const coveredShows = selectedShows.filter((show) =>
                  show.streamingServices.includes(service.id)
                );
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                  >
                    <ServiceCard
                      service={service}
                      isActive={isActive}
                      coveredShows={coveredShows}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {plan ? (
              <CostCalculator result={plan} />
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-pulse h-64" />
            )}
            <button
              onClick={() => router.push('/confirm')}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all text-sm"
            >
              Confirm My Plan →
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full text-zinc-500 text-sm py-2 hover:text-zinc-300 transition-colors"
            >
              ← Change my shows
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
