"use client";
import { useMemo } from 'react';
import type { Filters } from '@/components/P2PFilters';

export type P2PAd = {
  id: string;
  type: 'buy' | 'sell';
  token: 'BTC' | 'ETH' | 'USDT' | 'USDC';
  price_usd: number;
  price_inr: number;
  amount: number;
  payment_method: string;
  posted_by?: string;
  created_at?: string;
};

type Props = {
  ads: P2PAd[];
  filters: Filters;
};

export default function P2PTable({ ads, filters }: Props) {
  const filtered = useMemo(() => {
    return ads.filter((a) => {
      if (filters.side !== 'all' && a.type !== filters.side) return false;
      if (filters.token !== 'ALL' && a.token !== filters.token) return false;
      if (typeof filters.minPrice === 'number' && a.price_usd < filters.minPrice) return false;
      if (typeof filters.maxPrice === 'number' && a.price_usd > filters.maxPrice) return false;
      if (filters.payment && a.payment_method.toLowerCase() !== filters.payment.toLowerCase()) return false;
      return true;
    });
  }, [ads, filters]);

  if (filtered.length === 0) {
    return <div className="text-white/60 mt-6">No ads match your filters.</div>;
  }

  return (
    <div className="mt-4">
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="text-left font-medium py-2">Token</th>
              <th className="text-left font-medium py-2">Price USD</th>
              <th className="text-left font-medium py-2">Price INR</th>
              <th className="text-left font-medium py-2">Amount</th>
              <th className="text-left font-medium py-2">Payment Method</th>
              <th className="text-left font-medium py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ad) => (
              <tr key={ad.id} className="border-t border-white/10">
                <td className="py-3">{ad.token} {ad.type === 'buy' ? 'Buyer' : 'Seller'}</td>
                <td className="py-3">${ad.price_usd.toLocaleString()}</td>
                <td className="py-3">₹{ad.price_inr.toLocaleString()}</td>
                <td className="py-3">{ad.amount.toLocaleString()}</td>
                <td className="py-3">{ad.payment_method}</td>
                <td className="py-3">
                  <a
                    href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'Cryptomallu_bot'}?start=${encodeURIComponent(ad.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                  >
                    {ad.type === 'buy' ? 'Sell' : 'Buy'}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:hidden grid-cols-1 gap-3">
        {filtered.map((ad) => (
          <div key={ad.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{ad.token} {ad.type === 'buy' ? 'Buyer' : 'Seller'}</div>
              <div className="text-xs text-white/60">{ad.payment_method}</div>
            </div>
            <div className="mt-2 text-white/80 text-sm">USD: ${ad.price_usd.toLocaleString()} · INR: ₹{ad.price_inr.toLocaleString()}</div>
            <div className="mt-1 text-white/60 text-sm">Amount: {ad.amount.toLocaleString()}</div>
            <a
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'Cryptomallu_bot'}?start=${encodeURIComponent(ad.id)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary mt-3 w-full"
            >
              {ad.type === 'buy' ? 'Sell' : 'Buy'}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

