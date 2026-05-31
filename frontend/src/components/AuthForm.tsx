'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  initialMode?: AuthMode;
}

export default function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const router = useRouter();
  const { login, signup, loading } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Strong enough to also satisfy streaming-service sign-up rules, since Curate
  // reuses this password to create those accounts.
  const pwRules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'An uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'A lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'A number', ok: /[0-9]/.test(password) },
  ];
  const pwValid = pwRules.every((r) => r.ok);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (mode === 'signup') {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
      const normalizedEmail = email.trim().toLowerCase();
      const hasCompletedOnboarding = useOnboardingStore.getState().isComplete(normalizedEmail);
      router.push(hasCompletedOnboarding ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white">curate</h1>
          <p className="text-zinc-500 text-sm mt-2">Smart streaming. Zero waste.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex bg-zinc-800 rounded-xl p-1 mb-6">
            {(['login', 'signup'] as AuthMode[]).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => setMode(nextMode)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === nextMode
                    ? 'bg-white text-black shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {nextMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs text-zinc-400 font-medium mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required={mode === 'signup'}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-zinc-500 placeholder-zinc-600 transition"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs text-zinc-400 font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-zinc-500 placeholder-zinc-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-zinc-500 placeholder-zinc-600 transition"
              />
            </div>

            {mode === 'signup' && password.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {pwRules.map((r) => (
                  <div
                    key={r.label}
                    className={`flex items-center gap-1.5 text-[11px] ${
                      r.ok ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    <span>{r.ok ? '✓' : '○'}</span>
                    {r.label}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-950/50 border border-red-900/50 text-red-300 rounded-xl px-3 py-2 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !pwValid)}
              className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-100 active:scale-95 disabled:opacity-50 transition-all text-sm mt-2"
            >
              {loading ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-xs text-zinc-600 text-center mt-4">
            {mode === 'login' ? (
              <>
                No account yet?{' '}
                <Link href="/signup" className="text-zinc-400 hover:text-white">
                  Create one
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href="/login" className="text-zinc-400 hover:text-white">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
