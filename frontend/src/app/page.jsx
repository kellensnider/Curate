'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SHOWS, ALL_GENRES, optimizeSubscriptions } from '../lib/mockData';
import { useShowStore } from '../store/useShowStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import ShowGrid from '../components/shows/ShowGrid';
import GenreFilter from '../components/onboarding/GenreFilter';
import Navbar from '../components/navigation/Navbar';

export default function OnboardingPage() {
  const router = useRouter();
  const [activeGenre, setActiveGenre] = useState('All');
  const [mounted, setMounted] = useState(false);

  const { selectedShowIds } = useShowStore();
  const { runOptimization } = useSubscriptionStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredShows = useMemo(() => {
    if (activeGenre === 'All') return SHOWS;
    return SHOWS.filter((show) =>
      show.genres.some((g) => g.toLowerCase() === activeGenre.toLowerCase())
    );
  }, [activeGenre]);

  const estimatedCost = useMemo(() => {
    if (selectedShowIds.length === 0) return 0;
    return optimizeSubscriptions(selectedShowIds).monthlyTotal;
  }, [selectedShowIds]);

  function handleBuildPlan() {
    runOptimization(selectedShowIds);
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-none">
            What do you<br />want to watch?
          </h1>
          <p className="text-zinc-400 text-lg mt-4 font-medium">
            Tell us your shows. We&apos;ll handle the subscriptions.
          </p>
        </motion.div>

        {/* Genre filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <GenreFilter genres={ALL_GENRES} active={activeGenre} onChange={setActiveGenre} />
        </motion.div>

        {/* Show grid */}
        <div className="pb-36">
          <ShowGrid shows={filteredShows} loading={!mounted} />
        </div>
      </div>

      {/* Floating bottom bar */}
      <AnimatePresence>
        {selectedShowIds.length > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          >
            <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-2xl shadow-black/50">
              <div>
                <p className="text-white font-semibold text-sm">
                  {selectedShowIds.length} show{selectedShowIds.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Estimated:{' '}
                  <span className="text-emerald-400 font-semibold">
                    ${estimatedCost.toFixed(2)}/month
                  </span>
                </p>
              </div>
              <button
                onClick={handleBuildPlan}
                className="shrink-0 bg-white text-black text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all"
              >
                Build My Plan →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
