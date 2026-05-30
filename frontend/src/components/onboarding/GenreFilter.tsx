'use client';

import { motion } from 'framer-motion';

interface GenreFilterProps {
  genres: string[];
  active: string;
  onChange: (genre: string) => void;
}

export default function GenreFilter({ genres, active, onChange }: GenreFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => onChange(genre)}
          className={`relative shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === genre
              ? 'text-white'
              : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800'
          }`}
        >
          {active === genre && (
            <motion.span
              layoutId="genre-pill"
              className="absolute inset-0 bg-zinc-700 rounded-full"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10">{genre}</span>
        </button>
      ))}
    </div>
  );
}
