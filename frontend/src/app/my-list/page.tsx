'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICES, type Show } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';
import { useWatchedStore } from '../../store/useWatchedStore';
import { useAuthStore } from '../../store/useAuthStore';
import Navbar from '../../components/navigation/Navbar';

export default function MyListPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { watchlist, watchlistLoading, fetchWatchlist, watchlistAsShows, removeShowFromWatchlist } =
    useShowStore();
  const { watchedIds, markWatched, unmarkWatched } = useWatchedStore();

  const [active, setActive] = useState<Show | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth?mode=signin');
      return;
    }
    fetchWatchlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shows = watchlistAsShows();

  async function handleMarkWatched(show: Show) {
    setBusy(true);
    markWatched(show.id);
    await removeShowFromWatchlist(show.id);
    setBusy(false);
    setActive(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black text-white">My List</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {shows.length} to watch · {watchedIds.length} watched
          </p>
        </motion.div>

        {/* Loading */}
        {watchlistLoading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-zinc-800 animate-pulse"
                style={{ aspectRatio: '2/3' }}
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {!watchlistLoading && shows.length === 0 && (
          <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <p className="text-zinc-400 text-sm mb-4">Your list is empty.</p>
            <button
              onClick={() => router.push('/browse')}
              className="bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-zinc-100 transition"
            >
              Browse Shows →
            </button>
          </div>
        )}

        {/* Watchlist grid */}
        {!watchlistLoading && shows.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {shows.map((show) => (
              <motion.button
                key={show.id}
                layout
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActive(show)}
                className="relative rounded-2xl overflow-hidden text-left"
                style={{ aspectRatio: '2/3' }}
              >
                <img
                  src={show.posterUrl}
                  alt={show.title}
                  className="absolute inset-0 w-full h-full object-cover brightness-75 hover:brightness-90 transition"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  {show.streamingServices.slice(0, 2).map((sId) => {
                    const svc = SERVICES.find((s) => s.id === sId);
                    return (
                      <div
                        key={sId}
                        className="w-2.5 h-2.5 rounded-full border border-black/30"
                        style={{ backgroundColor: svc?.brandColor ?? '#666' }}
                      />
                    );
                  })}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-white text-xs font-semibold leading-snug line-clamp-2">
                    {show.title}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Watched section */}
        {watchedIds.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Watched ({watchedIds.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {watchedIds.map((id) => {
                const title = id; // ids are external ids; show id chip
                return (
                  <button
                    key={id}
                    onClick={() => unmarkWatched(id)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400 hover:border-zinc-700 transition"
                    title="Click to remove from watched"
                  >
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path
                        d="M1 4.5L4 7.5L10 1"
                        stroke="#4ade80"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="max-w-[10rem] truncate">{title}</span>
                    <span className="text-zinc-600 group-hover:text-red-400">×</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Mark-as-watched modal */}
      <AnimatePresence>
        {active && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActive(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
            >
              <div className="flex gap-4">
                <img
                  src={active.posterUrl}
                  alt={active.title}
                  className="w-24 h-36 rounded-xl object-cover shrink-0 shadow-lg"
                />
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white leading-tight">{active.title}</h2>
                  <p className="text-zinc-400 text-sm mt-1">{active.year}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {active.streamingServices.map((sId) => {
                      const svc = SERVICES.find((s) => s.id === sId);
                      if (!svc) return null;
                      return (
                        <span
                          key={sId}
                          className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                          style={{
                            color: svc.brandColor,
                            backgroundColor: svc.brandColor + '18',
                          }}
                        >
                          {svc.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mark watched */}
              <button
                onClick={() => handleMarkWatched(active)}
                disabled={busy}
                className="group w-full mt-6 flex items-center gap-3 p-4 bg-zinc-800 hover:bg-emerald-950/50 border border-zinc-700 hover:border-emerald-800 rounded-2xl transition-colors disabled:opacity-50"
              >
                <span className="w-7 h-7 rounded-lg border-2 border-zinc-600 group-hover:border-emerald-500 flex items-center justify-center transition-colors">
                  <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                    <path
                      d="M1 5.5L5 9.5L13 1.5"
                      stroke="#4ade80"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </svg>
                </span>
                <span className="text-sm font-semibold text-white text-left">
                  {busy ? 'Saving…' : 'Mark as watched & remove from list'}
                </span>
              </button>

              <button
                onClick={() => setActive(null)}
                className="w-full mt-2 py-2.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
