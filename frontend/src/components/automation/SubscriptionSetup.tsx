'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  startAgentRun,
  getDemoRun,
  API_BASE,
  type DemoRun,
} from '../../lib/api';

// Services the computer-use agent can set up. Others (e.g. appletv, peacock)
// are skipped with a note.
const SUPPORTED: Record<string, string> = {
  tubi: 'Tubi',
  netflix: 'Netflix',
  disney: 'Disney+',
  hulu: 'Hulu',
  max: 'Max',
};

const POLL_MS = 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Result {
  service: string;
  status: 'done' | 'error';
  message: string;
}

/**
 * Post-audit account setup. After an audit produces next month's plan, the AI
 * agent (Gemini Computer Use on Vertex AI) opens a browser and creates an
 * account for each new subscription in the plan, one after another.
 */
export default function SubscriptionSetup({
  services,
  password = '',
}: {
  services: string[];
  password?: string;
}) {
  const supported = useMemo(() => services.filter((s) => SUPPORTED[s]), [services]);
  const unsupported = useMemo(() => services.filter((s) => !SUPPORTED[s]), [services]);

  const [pw, setPw] = useState(password);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState<DemoRun | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const setupAll = useCallback(async () => {
    if (busy.current || supported.length === 0) return;
    busy.current = true;
    setPhase('running');
    setResults([]);
    setError(null);

    for (let i = 0; i < supported.length; i++) {
      const service = supported[i];
      setIndex(i);
      setRun(null);
      try {
        const { runId } = await startAgentRun(service, { password: pw || undefined });
        let current: DemoRun;
        do {
          await sleep(POLL_MS);
          current = await getDemoRun(runId);
          setRun(current);
        } while (current.status === 'running');
        setResults((r) => [
          ...r,
          {
            service,
            status: current.status === 'done' ? 'done' : 'error',
            message: current.result?.message || current.error || '',
          },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        // Browser automation is disabled on the hosted server — stop and explain
        // rather than marking every service as failed.
        if (/disabled|automation/i.test(msg)) {
          setError('Account setup runs in the Curate demo environment, where the browser agent is enabled.');
          break;
        }
        setResults((r) => [...r, { service, status: 'error', message: msg }]);
      }
    }

    setPhase('done');
    busy.current = false;
  }, [supported, pw]);

  if (supported.length === 0) return null;

  const running = phase === 'running';
  const frames = run?.frames ?? [];
  const latest = frames[frames.length - 1];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-lg font-semibold text-white">Set up next month&apos;s subscriptions</h3>
      <p className="mt-1 text-sm text-white/50">
        Curate&apos;s agent opens a browser and creates an account for each new subscription in your plan.
      </p>

      {/* Plan summary */}
      <div className="mt-4 flex flex-wrap gap-2">
        {supported.map((s, i) => {
          const done = results.find((r) => r.service === s);
          const active = running && i === index;
          return (
            <span
              key={s}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                done?.status === 'done'
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                  : done?.status === 'error'
                    ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
                    : active
                      ? 'border-white/40 bg-white/10 text-white'
                      : 'border-white/10 text-white/60'
              }`}
            >
              {SUPPORTED[s]}
            </span>
          );
        })}
      </div>

      {unsupported.length > 0 && (
        <p className="mt-2 text-xs text-white/40">
          Set up manually: {unsupported.join(', ')}
        </p>
      )}

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Account password"
          disabled={running}
          className="flex-1 min-w-[220px] rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/40 focus:outline-none disabled:opacity-40"
        />
        <button
          type="button"
          onClick={setupAll}
          disabled={running || !pw}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
        >
          {running
            ? `Setting up ${SUPPORTED[supported[index]]} (${index + 1}/${supported.length})…`
            : phase === 'done'
              ? 'Run again'
              : `Set up ${supported.length} account${supported.length > 1 ? 's' : ''}`}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {/* Live view of the current account */}
      {latest && (
        <div className="mt-5">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
            <img src={`${API_BASE}${latest.url}`} alt={latest.label} className="w-full object-contain" />
            {running && (
              <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                live
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current agent reasoning */}
      {run && run.steps.length > 0 && (
        <ol className="mt-4 space-y-1 text-sm">
          {run.steps.slice(-4).map((s, i) => (
            <li key={i} className="flex gap-2 text-white/55">
              <span className="text-white/30">›</span>
              {s.label}
            </li>
          ))}
        </ol>
      )}

      {/* Final summary */}
      {phase === 'done' && (
        <ul className="mt-4 space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.service} className={r.status === 'done' ? 'text-emerald-300' : 'text-rose-300'}>
              {SUPPORTED[r.service]}: {r.status === 'done' ? 'account created' : r.message || 'failed'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
