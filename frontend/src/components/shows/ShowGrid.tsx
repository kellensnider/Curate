'use client';

import { motion } from 'framer-motion';
import { Show } from '../../lib/mockData';
import ShowCard from './ShowCard';

interface ShowGridProps {
  shows: Show[];
  onCardClick?: (show: Show) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ShowGrid({ shows, onCardClick, loading, emptyMessage }: ShowGridProps) {
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

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      {shows.map((show) => (
        <motion.div key={show.id} variants={item}>
          <ShowCard
            show={show}
            onClick={onCardClick ? () => onCardClick(show) : undefined}
            selectable={!onCardClick}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
