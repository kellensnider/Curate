'use client';

interface InfoBubbleProps {
  text: string;
}

export default function InfoBubble({ text }: InfoBubbleProps) {
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-600/70 bg-transparent text-[10px] font-bold text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-xs font-normal leading-relaxed text-zinc-300 opacity-0 shadow-2xl shadow-black/50 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
      >
        {text}
      </span>
    </span>
  );
}
