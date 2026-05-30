'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { SERVICES, ALL_GENRES, type Show } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';
import ShowGrid from '../../components/shows/ShowGrid';
import ShowModal from '../../components/shows/ShowModal';
import GenreFilter from '../../components/onboarding/GenreFilter';
import Navbar from '../../components/navigation/Navbar';

export default function BrowsePage() {
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [activeService, setActiveService] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  // Debounce search so we don't fire on every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const { browseShows, browseLoading, browseError, fetchPopular, searchShows } = useShowStore();

  useEffect(() => {
    fetchPopular();
  }, []);

  // Fire API search when debounced query or filters change
  useEffect(() => {
    if (debouncedQuery || activeGenre !== 'All' || activeService) {
      searchShows(debouncedQuery, activeGenre !== 'All' ? activeGenre : undefined, activeService ?? undefined);
    } else {
      fetchPopular();
    }
  }, [debouncedQuery, activeGenre, activeService]);

  // Client-side filter for service (the API might not filter it perfectly)
  const filtered = useMemo(() => {
    if (!activeService) return browseShows;
    return browseShows.filter((s) => s.streamingServices.includes(activeService));
  }, [browseShows, activeService]);

  const emptyMsg = query
    ? `No shows found for "${query}"`
    : `No ${activeGenre !== 'All' ? activeGenre.toLowerCase() + ' ' : ''}shows found.`;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-black text-white mb-1">Browse</h1>
          <p className="text-zinc-400 text-sm">Search and add shows to your watchlist</p>
        </motion.div>

        {/* Sticky filters */}
        <div className="sticky top-14 z-30 bg-zinc-950/90 backdrop-blur-md pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
          {/* Search */}
          <div className="relative mb-3">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search shows…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <GenreFilter genres={ALL_GENRES} active={activeGenre} onChange={setActiveGenre} />

          {/* Service filters */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveService(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                !activeService ? 'bg-zinc-700 border-zinc-600 text-white' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All Services
            </button>
            {SERVICES.map((svc) => (
              <button
                key={svc.id}
                onClick={() => setActiveService(activeService === svc.id ? null : svc.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  activeService === svc.id ? 'text-black' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
                style={activeService === svc.id ? { backgroundColor: svc.brandColor, borderColor: svc.brandColor } : {}}
              >
                {svc.name}
              </button>
            ))}
          </div>
        </div>

        {browseError && (
          <p className="text-red-400 text-xs mb-4 text-center">{browseError}</p>
        )}

        {(query || activeGenre !== 'All' || activeService) && !browseLoading && (
          <p className="text-zinc-500 text-xs mb-4 pt-2">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        <ShowGrid
          shows={filtered}
          onCardClick={(show) => setSelectedShow(show)}
          loading={browseLoading}
          emptyMessage={emptyMsg}
        />
      </div>

      <ShowModal show={selectedShow} onClose={() => setSelectedShow(null)} />
    </div>
  );
}
