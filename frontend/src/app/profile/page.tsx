'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ALL_SERVICES_TOTAL } from '../../lib/mockData';
import { useAuthStore } from '../../store/useAuthStore';
import { usePreferencesStore } from '../../store/usePreferencesStore';
import Navbar from '../../components/navigation/Navbar';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, userName, userEmail, signOut } = useAuthStore();
  const {
    maxMonthlyCost,
    maxSubscriptions,
    setMaxMonthlyCost,
    setMaxSubscriptions,
  } = usePreferencesStore();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/auth?mode=signin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  function handleSignOut() {
    signOut();
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black text-white">Profile</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Set the limits your monthly audit has to respect.
          </p>
        </motion.div>

        {/* Account */}
        <section className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white font-black text-lg">
            {(userName || userEmail || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{userName || 'Your account'}</p>
            <p className="text-zinc-500 text-sm truncate">{userEmail || '—'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors shrink-0"
          >
            Sign out
          </button>
        </section>

        {/* Current subscriptions link */}
        <Link
          href="/subscriptions"
          className="flex items-center justify-between gap-3 mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition"
        >
          <div>
            <p className="text-white font-semibold">Current subscriptions</p>
            <p className="text-zinc-500 text-sm mt-0.5">
              Manage what you pay for and how long each lasts.
            </p>
          </div>
          <span className="text-zinc-400 text-sm shrink-0">Manage →</span>
        </Link>

        {/* Preferences */}
        <section className="space-y-5">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Audit Preferences
          </h2>

          {/* Max monthly cost */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-white font-semibold">Max monthly cost</p>
                <p className="text-zinc-500 text-sm mt-0.5">
                  The audit won&apos;t recommend a plan above this.
                </p>
              </div>
              <p className="text-3xl font-black text-white">
                ${maxMonthlyCost}
                <span className="text-base text-zinc-500 font-medium">/mo</span>
              </p>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              step={1}
              value={maxMonthlyCost}
              onChange={(e) => setMaxMonthlyCost(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-2">
              <span>$5</span>
              <span>$80</span>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Subscribing to everything would cost{' '}
              <span className="text-zinc-300 font-semibold">${ALL_SERVICES_TOTAL.toFixed(2)}/mo</span>.
            </p>
          </div>

          {/* Max subscriptions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-white font-semibold">Max subscriptions</p>
                <p className="text-zinc-500 text-sm mt-0.5">
                  How many services you&apos;re willing to juggle at once.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxSubscriptions(n)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    maxSubscriptions === n
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              A bundle (e.g. Disney+ &amp; Hulu) counts as a single subscription.
            </p>
          </div>
        </section>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-8 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-100 active:scale-[0.99] transition-all text-sm"
        >
          Run an audit with these limits →
        </button>
      </div>
    </div>
  );
}
