'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { forgotPassword } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email');
    } finally {
      setLoading(false);
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
          <p className="text-zinc-500 text-sm mt-2">Reset your password.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white">Forgot password?</h2>
          <p className="text-sm text-zinc-500 mt-1 mb-5">
            Enter your email and we&apos;ll send a reset link if the account exists.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {message && (
              <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 rounded-xl px-3 py-2 text-xs">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-950/50 border border-red-900/50 text-red-300 rounded-xl px-3 py-2 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-100 active:scale-95 disabled:opacity-50 transition-all text-sm"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <p className="text-xs text-zinc-600 text-center mt-4">
            Remembered it?{' '}
            <Link href="/login" className="text-zinc-400 hover:text-white">
              Back to login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
