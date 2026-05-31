'use client';

import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { savePaymentCard, deletePaymentCard } from '../lib/api';

// Light formatting helpers so the inputs feel like a real card form.
function formatNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PaymentCardSection() {
  const { user, setUser } = useAuthStore();
  const card = user?.paymentCard ?? null;

  const [editing, setEditing] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setCardholderName('');
    setNumber('');
    setExpiry('');
    setCvc('');
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const { user: updated } = await savePaymentCard({
        cardholderName,
        number,
        expiry,
        cvc,
      });
      setUser(updated);
      setEditing(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save card');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    setError(null);
    try {
      const { user: updated } = await deletePaymentCard();
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove card');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 mb-8">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Payment method
      </h2>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        {card && !editing ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-white font-semibold">
                {card.brand || 'Card'} •••• {card.last4}
              </p>
              <p className="text-zinc-500 text-sm mt-0.5 truncate">
                {card.cardholderName ? `${card.cardholderName} · ` : ''}
                Expires {card.expiry || '—'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  setCardholderName(card.cardholderName || '');
                  setEditing(true);
                }}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Replace
              </button>
              <button
                onClick={handleRemove}
                disabled={saving}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : !card && !editing ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">No card on file</p>
              <p className="text-zinc-500 text-sm mt-0.5">
                Add a card so Curate can set up paid subscriptions for you.
              </p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-xl hover:bg-zinc-100 transition shrink-0"
            >
              Add card
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500">Cardholder name</label>
              <input
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Card number</label>
              <input
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(formatNumber(e.target.value))}
                placeholder="4242 4242 4242 4242"
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-zinc-500 tracking-widest"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-zinc-500">Expiry</label>
                <input
                  inputMode="numeric"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-zinc-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-500">CVC</label>
                <input
                  inputMode="numeric"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Demo only — card details are stored without payment-grade encryption.
              Don&apos;t enter a real card you care about.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-white text-black font-bold py-2.5 rounded-xl hover:bg-zinc-100 active:scale-[0.99] transition-all text-sm disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save card'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  resetForm();
                }}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
