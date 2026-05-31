'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { resetPassword } from '../../lib/api';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError('Reset link is invalid or expired.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setMessage(result.message);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
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
          <p className="text-zinc-500 text-sm mt-2">Choose a new password.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white">Reset password</h2>
          <p className="text-sm text-zinc-500 mt-1 mb-5">
            Your reset link expires 30 minutes after it was requested.
          </p>

          {message ? (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 rounded-xl px-3 py-2 text-xs">
                {message}
              </div>
              <Link
                href="/login"
                className="block w-full text-center bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all text-sm"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 font-medium mb-1.5">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-zinc-500 placeholder-zinc-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 font-medium mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-zinc-500 placeholder-zinc-600 transition"
                />
              </div>

              {error && (
                <div className="bg-red-950/50 border border-red-900/50 text-red-300 rounded-xl px-3 py-2 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-100 active:scale-95 disabled:opacity-50 transition-all text-sm"
              >
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          )}

          {!message && (
            <p className="text-xs text-zinc-600 text-center mt-4">
              Need a new link?{' '}
              <Link href="/forgot-password" className="text-zinc-400 hover:text-white">
                Request one
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
