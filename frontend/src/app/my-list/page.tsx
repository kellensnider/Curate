'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICES, SHOWS, type Show } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';
import { useWatchedStore } from '../../store/useWatchedStore';
import { useAuthStore } from '../../store/useAuthStore';
import Navbar from '../../components/navigation/Navbar';

type Filter = 'all' | 'to-watch' | 'watched';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'to-watch', label: 'To watch' },
  { key: 'watched', label: 'Watched' },
];

export default function MyListPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { watchlistLoading, fetchWatchlist, watchlistAsShows, removeShowFromWatchlist } =
    useShowStore();
  const { watchedIds, markWatched } = useWatchedStore();

  const [active, setActive] = useState<Show | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth?mode=signin');
      return;
    }
    fetchWatchlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shows = watchlistAsShows();
  const watchedShows = SHOWS.filter((s) => watchedIds.includes(s.id));
  const servicesNeeded = new Set(shows.flatMap((s) => s.streamingServices)).size;

  const displayShows = filter === 'watched' ? watchedShows : shows;

  async function handleMarkWatched(show: Show) {
    setBusy(true);
    markWatched(show.id);
    await removeShowFromWatchlist(show.id);
    setBusy(false);
    setActive(null);
  }

  return (
    <div className="min-h-screen" style={{ position: 'relative' }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-6">
        {/* Page title */}
        <div style={{ paddingTop: 28, marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white', lineHeight: 1.2, margin: 0 }}>
            My List
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, marginBottom: 0 }}>
            Add shows, track what you&apos;ve watched, and run an audit to plan next month.
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <StatCard value={shows.length} label="Shows in list" />
          <StatCard value={watchedIds.length} label="Watched" />
          <StatCard value={servicesNeeded} label="Services needed" />
        </div>

        {/* Audit ready banner */}
        {shows.length > 0 && (
          <div
            style={{
              background: 'rgba(55,138,221,0.1)',
              border: '0.5px solid rgba(55,138,221,0.22)',
              borderRadius: 10,
              padding: '11px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
              flexWrap: 'nowrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#378ADD',
                  flexShrink: 0,
                }}
              />
              <p style={{ fontSize: 13, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ color: 'white', fontWeight: 600 }}>Audit ready</span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {' '}·{' '}{shows.length} show{shows.length !== 1 ? 's' : ''} across{' '}
                  {servicesNeeded} service{servicesNeeded !== 1 ? 's' : ''} · run an audit to plan next month
                </span>
              </p>
            </div>
            <Link
              href="/dashboard"
              style={{
                fontSize: 13,
                color: '#378ADD',
                flexShrink: 0,
                marginLeft: 20,
                textDecoration: 'none',
              }}
            >
              Run audit
            </Link>
          </div>
        )}

        {/* Section header + filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'white', margin: 0 }}>Shows</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  borderRadius: 20,
                  padding: '5px 13px',
                  fontSize: 12,
                  border: filter === key
                    ? '0.5px solid rgba(255,255,255,0.3)'
                    : '0.5px solid rgba(255,255,255,0.11)',
                  color: filter === key ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.38)',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {watchlistLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{ borderRadius: 10, background: '#1e1e1e', aspectRatio: '2/3' }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!watchlistLoading && displayShows.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 0',
              background: '#181818',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              marginBottom: 28,
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>
              {filter === 'watched' ? 'No watched shows yet.' : 'Your list is empty.'}
            </p>
            {filter !== 'watched' && (
              <button
                onClick={() => router.push('/browse')}
                style={{
                  background: 'white',
                  color: 'black',
                  fontWeight: 600,
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Browse Shows →
              </button>
            )}
          </div>
        )}

        {/* Poster grid */}
        {!watchlistLoading && displayShows.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              paddingBottom: 28,
            }}
          >
            {displayShows.map((show) => (
              <PosterCard
                key={show.id}
                show={show}
                onClick={filter !== 'watched' ? () => setActive(show) : undefined}
              />
            ))}
          </div>
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

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        background: '#181818',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '12px 16px',
      }}
    >
      <p style={{ fontSize: 22, fontWeight: 500, color: 'white', margin: 0 }}>{value}</p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>{label}</p>
    </div>
  );
}

function PosterCard({ show, onClick }: { show: Show; onClick?: () => void }) {
  const primarySvc = SERVICES.find((s) => s.id === show.streamingServices[0]);

  return (
    <motion.button
      layout
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        aspectRatio: '2/3',
        border: '0.5px solid rgba(255,255,255,0.07)',
        background: '#1a1a1a',
        cursor: onClick ? 'pointer' : 'default',
        display: 'block',
        width: '100%',
        padding: 0,
      }}
    >
      <img
        src={show.posterUrl}
        alt={show.title}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        loading="lazy"
      />
      {/* Bottom overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.78))',
        }}
      />
      {/* Service dot */}
      {primarySvc && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: primarySvc.brandColor,
          }}
        />
      )}
      {/* Title */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 8px 8px' }}>
        <p
          className="line-clamp-2"
          style={{ fontSize: 12, fontWeight: 500, color: 'white', margin: 0, lineHeight: 1.3 }}
        >
          {show.title}
        </p>
      </div>
    </motion.button>
  );
}
