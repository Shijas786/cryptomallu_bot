"use client";
import { useState } from 'react';

type Props = { onPosted?: () => void };

export default function PostAdForm({ onPosted }: Props) {
  const [form, setForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    token: 'USDT' as 'BTC' | 'ETH' | 'USDT' | 'USDC',
    price_usd: '',
    price_inr: '',
    amount: '',
    payment_method: 'UPI',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          token: form.token,
          price_usd: Number(form.price_usd),
          price_inr: Number(form.price_inr),
          amount: Number(form.amount),
          payment_method: form.payment_method,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed');
      if (onPosted) onPosted();
      setForm({ ...form, price_usd: '', price_inr: '', amount: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
      <select className="bg-transparent border border-white/20 rounded-lg px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'buy' | 'sell' })}>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>
      <select className="bg-transparent border border-white/20 rounded-lg px-3 py-2" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value as any })}>
        <option>USDT</option>
        <option>USDC</option>
        <option>BTC</option>
        <option>ETH</option>
      </select>
      <input className="bg-transparent border border-white/20 rounded-lg px-3 py-2" placeholder="Price USD" type="number" step="any" value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} />
      <input className="bg-transparent border border-white/20 rounded-lg px-3 py-2" placeholder="Price INR" type="number" step="any" value={form.price_inr} onChange={(e) => setForm({ ...form, price_inr: e.target.value })} />
      <input className="bg-transparent border border-white/20 rounded-lg px-3 py-2" placeholder="Amount" type="number" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      <input className="bg-transparent border border-white/20 rounded-lg px-3 py-2" placeholder="Payment (e.g. UPI)" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} />
      <div className="md:col-span-6 flex items-center gap-3">
        <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Posting…' : 'Post Ad'}</button>
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </form>
  );
}

