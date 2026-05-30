'use client';

import { Show, Service } from '../../lib/mockData';

interface ServiceCardProps {
  service: Service;
  isActive: boolean;
  coveredShows?: Show[];
}

export default function ServiceCard({ service, isActive, coveredShows = [] }: ServiceCardProps) {
  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-300 ${
        isActive
          ? 'bg-zinc-900 border-2'
          : 'bg-zinc-900/40 border border-zinc-800 opacity-40 grayscale'
      }`}
      style={
        isActive
          ? {
              borderColor: service.brandColor,
              boxShadow: `0 0 24px ${service.brandColor}18`,
            }
          : {}
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-sm font-black tracking-tight leading-none"
          style={{ color: isActive ? service.brandColor : '#555' }}
        >
          {service.logo}
        </span>
        {isActive ? (
          <span className="text-xs bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-900/60">
            Active
          </span>
        ) : (
          <span className="text-xs text-zinc-600 px-1">Not needed</span>
        )}
      </div>

      {/* Price */}
      <div className="text-2xl font-bold text-white">${service.monthlyPrice.toFixed(2)}</div>
      <div className="text-xs text-zinc-500">/month</div>

      {/* Covered shows */}
      {isActive && coveredShows.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1.5">
            {coveredShows.length} show{coveredShows.length !== 1 ? 's' : ''} covered
          </p>
          <div className="flex flex-wrap gap-1">
            {coveredShows.slice(0, 3).map((show) => (
              <span
                key={show.id}
                className="text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full truncate max-w-[90px]"
              >
                {show.title}
              </span>
            ))}
            {coveredShows.length > 3 && (
              <span className="text-xs text-zinc-500 px-1 py-0.5">
                +{coveredShows.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
