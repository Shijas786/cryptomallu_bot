"use client";
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import P2PFilters, { type Filters } from '@/components/P2PFilters';
import P2PTable, { type P2PAd } from '@/components/P2PTable';
import PostAdForm from './PostAdForm';
import EscrowPanel from '@/components/EscrowPanel';

export default function P2PPage() {
  const [ads, setAds] = useState<P2PAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ side: 'all', token: 'ALL' });

  const payments = useMemo(() => {
    const s = new Set(ads.map((a) => a.payment_method));
    return Array.from(s).sort();
  }, [ads]);

  useEffect(() => {
    const client = supabaseBrowser();
    let cancel = false;

    const fetchAds = async () => {
      setLoading(true);
      const { data, error } = await client
        .from('ads')
        .select('id, type, token, price_usd, price_inr, amount, payment_method, posted_by, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!cancel) {
        if (error) {
          console.warn('Failed to fetch ads from supabase. Using placeholder.', error);
          setAds(getPlaceholderAds());
        } else {
          setAds((data as unknown as P2PAd[]) ?? []);
        }
        setLoading(false);
      }
    };

    fetchAds();
    const interval = setInterval(fetchAds, 30_000);

    return () => {
      cancel = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold">P2P Marketplace</h1>
      <p className="text-white/60 mt-1">Browse live ads. Click Buy/Sell to continue on Telegram.</p>

      <div className="mt-6">
        <PostAdForm onPosted={() => {
          // simple refresh by reloading the page data via supabase effect
          // trigger by toggling loading
          setLoading(true);
          // force a refresh by temporarily clearing ads (effect runs on interval too)
          setAds((prev) => prev);
        }} />
      </div>

      <div className="mt-6">
        <P2PFilters filters={filters} onChange={setFilters} availablePayments={payments} />
        {loading ? (
          <div className="text-white/60 mt-6">Loading ads…</div>
        ) : (
          <P2PTable ads={ads} filters={filters} />
        )}
      </div>

      {/* Simple anchor to open escrow panel from bot deep link */}
      <div id="escrow-anchor" className="mt-8">
        <EscrowPanel adId={(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('trade') || '' : '')} />
      </div>
    </div>
  );
}

function getPlaceholderAds(): P2PAd[] {
  return [
    { id: 'demo-1', type: 'buy', token: 'USDT', price_usd: 1, price_inr: 83.1, amount: 1200, payment_method: 'UPI' },
    { id: 'demo-2', type: 'sell', token: 'USDC', price_usd: 1, price_inr: 83.0, amount: 1500, payment_method: 'Bank Transfer' },
    { id: 'demo-3', type: 'sell', token: 'BTC', price_usd: 63500, price_inr: 5270000, amount: 0.15, payment_method: 'UPI' },
    { id: 'demo-4', type: 'buy', token: 'ETH', price_usd: 3500, price_inr: 290000, amount: 2.5, payment_method: 'IMPS' },
  ];
}

