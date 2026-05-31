'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Show, SERVICES } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';

interface ShowCardProps {
  show: Show;
  onClick?: () => void;
  selectable?: boolean;
}

export default function ShowCard({ show, onClick, selectable = true }: ShowCardProps) {
  const { selectedShowIds, toggleSelected } = useShowStore();
  const isSelected = selectedShowIds.includes(show.id);

  function handleClick() {
    if (onClick) {
      onClick();
    } else if (selectable) {
      toggleSelected(show.id);
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className={`relative cursor-pointer rounded-2xl overflow-hidden select-none ${
        isSelected && selectable ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950' : ''
      }`}
      style={{ aspectRatio: '2/3' }}
    >
      {/* Poster image */}
      <img
        src={show.posterUrl}
        alt={show.title}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
          isSelected && selectable ? 'brightness-90' : 'brightness-75 hover:brightness-90'
        }`}
        loading="lazy"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

      {/* Service badges */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {show.streamingServices.slice(0, 2).map((sId) => {
          const svc = SERVICES.find((s) => s.id === sId);
          return (
            <div
              key={sId}
              className="w-2.5 h-2.5 rounded-full border border-black/30 shadow-sm"
              style={{ backgroundColor: svc?.brandColor ?? '#666' }}
            />
          );
        })}
      </div>

      {/* Selected checkmark */}
      {selectable && (
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                <path
                  d="M1 4.5L4 7.5L10 1"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Title + year */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{show.title}</p>
        <p className="text-zinc-400 text-xs mt-0.5">{show.year}</p>
      </div>
    </motion.div>
  );
}
