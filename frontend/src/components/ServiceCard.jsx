'use client';

const SERVICE_META = {
  netflix:   { name: 'Netflix',      color: 'bg-red-600' },
  hulu:      { name: 'Hulu',         color: 'bg-green-500' },
  disney:    { name: 'Disney+',      color: 'bg-blue-600' },
  max:       { name: 'Max',          color: 'bg-purple-600' },
  peacock:   { name: 'Peacock',      color: 'bg-yellow-500' },
  prime:     { name: 'Prime Video',  color: 'bg-sky-500' },
  appletv:   { name: 'Apple TV+',    color: 'bg-gray-500' },
  paramount: { name: 'Paramount+',   color: 'bg-blue-400' },
};

export default function ServiceCard({ service, status, monthly_cost, onActivate, onCancel, loading }) {
  const meta = SERVICE_META[service] || { name: service, color: 'bg-gray-600' };
  const isActive = status === 'active';

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-4 transition-all ${
      isActive
        ? 'bg-gray-800 border-gray-600'
        : 'bg-gray-900 border-gray-800 opacity-60'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${meta.color} flex items-center justify-center text-white font-bold text-sm`}>
          {meta.name[0]}
        </div>
        <div>
          <div className="font-semibold text-gray-100">{meta.name}</div>
          <div className="text-sm text-gray-400">${monthly_cost.toFixed(2)}/mo</div>
        </div>
        {isActive && (
          <span className="ml-auto text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">
            Active
          </span>
        )}
      </div>

      <button
        disabled={loading}
        onClick={() => isActive ? onCancel(service) : onActivate(service)}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
          isActive
            ? 'bg-gray-700 hover:bg-red-900 hover:text-red-300 text-gray-300'
            : 'bg-gray-800 hover:bg-green-900 hover:text-green-300 text-gray-400'
        }`}
      >
        {loading ? '...' : isActive ? 'Cancel' : 'Subscribe'}
      </button>
    </div>
  );
}
