'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Show, SERVICES } from '../../lib/mockData';
import { useShowStore } from '../../store/useShowStore';

interface ShowModalProps {
  show: Show | null;
  onClose: () => void;
}

export default function ShowModal({ show, onClose }: ShowModalProps) {
  const { isInWatchlist, addShowToWatchlist, removeShowFromWatchlist } = useShowStore();
  const [loading, setLoading] = useState(false);

  const inList = show ? isInWatchlist(show.id) : false;

  async function handleToggle() {
    if (!show) return;
    setLoading(true);
    if (inList) {
      await removeShowFromWatchlist(show.id);
    } else {
      await addShowToWatchlist(show.id);
    }
    setLoading(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex gap-5">
              <img
                src={show.posterUrl}
                alt={show.title}
                className="w-28 h-auto rounded-xl object-cover shrink-0 shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white leading-tight">{show.title}</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  {show.year} · ⭐ {show.rating.toFixed(1)}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {show.genres.map((g) => (
                    <span
                      key={g}
                      className="text-xs px-2.5 py-0.5 bg-zinc-800 text-zinc-300 rounded-full capitalize"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                <div className="mt-4">
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">
                    Available on
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {show.streamingServices.map((sId) => {
                      const svc = SERVICES.find((s) => s.id === sId);
                      if (!svc) return null;
                      return (
                        <div
                          key={sId}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold"
                          style={{
                            borderColor: svc.brandColor + '55',
                            color: svc.brandColor,
                            backgroundColor: svc.brandColor + '11',
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: svc.brandColor }} />
                          {svc.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleToggle}
                disabled={loading}
                className={`flex-1 font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50 ${
                  inList
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-red-950 hover:text-red-300'
                    : 'bg-white text-black hover:bg-zinc-100'
                }`}
              >
                {loading ? '…' : inList ? '✓ In My List — Remove' : 'Add to My List'}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
