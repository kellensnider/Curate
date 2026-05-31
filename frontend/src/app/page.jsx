'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SHOWS, ALL_SERVICES_TOTAL } from '../lib/mockData';
import { useAuthStore } from '../store/useAuthStore';

const STATS = [
  { value: '$61', label: 'Average household streaming bill / month' },
  { value: '$219', label: 'Wasted per year on services you barely watch' },
  { value: '47%', label: 'Of subscribers pay for content they never open' },
  { value: '8', label: 'Streaming services the average viewer juggles' },
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const posters = useMemo(() => {
    const withPosters = SHOWS.filter((s) => s.posterUrl);
    return withPosters.slice(0, 56);
  }, []);

  if (isAuthenticated) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="absolute inset-0">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 p-1.5 opacity-40">
          {posters.map((show) => (
            <div key={show.id} className="rounded-md overflow-hidden" style={{ aspectRatio: '2/3' }}>
              <img
                src={show.posterUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/85 to-zinc-950" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-zinc-950/80" />

      <header className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <span className="text-white font-black text-2xl tracking-tight">curate</span>
        <div className="flex items-center gap-3">
          <Link
            href="/auth?mode=signin"
            className="text-sm text-zinc-200 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="text-sm bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg font-bold transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-20 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.05]"
        >
          Every show you want.
          <br />
          Without paying for all of them.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-zinc-300 text-lg sm:text-xl mt-6 max-w-2xl mx-auto font-medium"
        >
          Curate builds your watchlist a month at a time - keeping only the one or
          two streaming services that cover what you actually watch, and canceling
          the rest.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9"
        >
          <Link
            href="/auth?mode=signup"
            className="w-full sm:w-auto bg-white text-black font-bold text-base px-8 py-3.5 rounded-xl hover:bg-zinc-200 active:scale-95 transition-all"
          >
            Get started - it's free
          </Link>
          <Link
            href="/auth?mode=signin"
            className="w-full sm:w-auto bg-zinc-800/80 backdrop-blur text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-zinc-700 active:scale-95 transition-all"
          >
            Log in
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-20"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-2xl p-5 text-left"
            >
              <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {stat.value}
              </p>
              <p className="text-zinc-400 text-xs sm:text-sm mt-2 leading-snug">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-zinc-500 text-sm mt-10"
        >
          Subscribing to everything costs{' '}
          <span className="text-zinc-300 font-semibold">
            ${ALL_SERVICES_TOTAL.toFixed(2)}/mo
          </span>
          . Most people need a fraction of that.
        </motion.p>
      </main>
    </div>
  );
}
