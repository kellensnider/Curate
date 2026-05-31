'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runAutomation, API_BASE, type AutomationResult } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Testing-only control to drive real Tubi sign-up / sign-out automation using
 * the user's OWN Curate credentials. The email comes from the signed-in account
 * (server-side); the password is your Curate password, captured in memory at
 * login and never persisted. Requires the backend automation worker running
 * with AUTOMATION_ENABLED=true.
 */
export default function AutomationPanel() {
  const { userEmail, accountPassword } = useAuthStore();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'subscribe' | 'unsubscribe' | null>(null);
  const [result, setResult] = useState<AutomationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with the Curate password captured at login (lost on refresh).
  useEffect(() => {
    if (accountPassword) setPassword(accountPassword);
  }, [accountPassword]);

  async function run(action: 'subscribe' | 'unsubscribe') {
    if (!userEmail) {
      setError('Sign in to Curate first.');
      return;
    }
    if (!password) {
      setError('Enter your Curate password to continue.');
      return;
    }
    setBusy(action);
    setError(null);
    setResult(null);
    try {
      const r = await runAutomation('tubi', action, password);
      setResult(r);
      if (!r.ok && r.error) setError(r.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Automation failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-bold text-white">Live service automation</h3>
        <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
          Testing · Tubi
        </span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Curate signs up for (or cancels) Tubi using your account. Your Curate
        password is reused so the streaming account matches — it&apos;s sent once
        per run and never stored.
      </p>

      {/* Account identity (from the signed-in user) */}
      <div className="mb-3">
        <label className="block text-[11px] text-zinc-500 mb-1">Streaming account</label>
        <div className="bg-zinc-800/60 border border-zinc-700 text-zinc-300 text-sm px-3 py-2 rounded-lg truncate">
          {userEmail || 'Not signed in'}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] text-zinc-500 mb-1">
          Curate password{accountPassword ? ' (from your login)' : ''}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your Curate password"
          autoComplete="off"
          className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 placeholder-zinc-600"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => run('subscribe')}
          disabled={!!busy}
          className="flex-1 bg-emerald-500 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-emerald-400 disabled:opacity-50 transition"
        >
          {busy === 'subscribe' ? 'Subscribing…' : 'Subscribe to Tubi'}
        </button>
        <button
          onClick={() => run('unsubscribe')}
          disabled={!!busy}
          className="flex-1 bg-zinc-800 text-zinc-200 text-sm font-bold py-2.5 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition"
        >
          {busy === 'unsubscribe' ? 'Cancelling…' : 'Unsubscribe'}
        </button>
      </div>

      <AnimatePresence>
        {(result || error) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`mt-3 rounded-lg border p-3 text-xs ${
                result?.ok
                  ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'
                  : 'bg-red-950/30 border-red-900/40 text-red-300'
              }`}
            >
              <p className="font-semibold">
                {result?.ok ? `✓ ${result.message}` : error ?? 'Failed'}
              </p>
              {result?.steps && result.steps.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-zinc-400">
                  {result.steps.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              )}
              {result?.screenshot && (
                <a
                  href={`${API_BASE}${result.screenshot}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-zinc-300 underline hover:text-white"
                >
                  View screenshot →
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
