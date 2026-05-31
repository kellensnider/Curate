'use client';

import InfoBubble from '../ui/InfoBubble';

const TOOLTIP =
  'You have unlimited free access to this service, such as through a family member. Curate will treat it as active and $0/month.';

interface InfiniteMembershipControlProps {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}

export default function InfiniteMembershipControl({
  enabled,
  disabled,
  onChange,
}: InfiniteMembershipControlProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        aria-pressed={enabled}
        className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled
            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
            : 'border-zinc-700 bg-transparent text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${
            enabled ? 'border-emerald-400 bg-emerald-400 text-zinc-950' : 'border-zinc-600'
          }`}
        >
          {enabled ? (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path
                d="M1 4L3.6 6.5L9 1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
        Infinite membership
      </button>
      <InfoBubble text={TOOLTIP} />
    </div>
  );
}
