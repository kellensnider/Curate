'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Show } from '../../lib/mockData';
import ShowCard from './ShowCard';

interface ShowGridProps {
  shows: Show[];
  onCardClick?: (show: Show) => void;
  loading?: boolean;
  emptyMessage?: string;
}

// Reveal the grid one "page" (a few rows) at a time instead of mounting the
// whole list up front. This lets the first rows paint almost instantly and
// keeps the entrance stagger short, rather than scheduling thousands of cards.
const PAGE_SIZE = 20;

export default function ShowGrid({ shows, onCardClick, loading, emptyMessage }: ShowGridProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Whenever the result set changes (new search / filter), start from page one.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [shows]);

  // Reveal the next page as the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => (v < shows.length ? v + PAGE_SIZE : v));
        }
      },
      // Start loading the next rows a bit before they reach the viewport.
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shows.length, visible]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-zinc-800 animate-pulse"
            style={{ aspectRatio: '2/3' }}
          />
        ))}
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <div className="text-center py-24 text-zinc-500 text-sm">
        {emptyMessage ?? 'No shows found.'}
      </div>
    );
  }

  const items = shows.slice(0, visible);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((show, i) => (
          <motion.div
            key={show.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            // Stagger only within a page so the delay never grows with the list.
            transition={{ duration: 0.35, delay: (i % PAGE_SIZE) * 0.04 }}
          >
            <ShowCard
              show={show}
              onClick={onCardClick ? () => onCardClick(show) : undefined}
              selectable={!onCardClick}
            />
          </motion.div>
        ))}
      </div>

      {visible < shows.length && <div ref={sentinelRef} className="h-1 w-full" />}
    </>
  );
}
