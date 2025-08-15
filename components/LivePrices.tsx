"use client";
import useSWR from 'swr';

type PriceResponse = {
  data?: Record<string, {
    usd: number;
    inr: number;
    market_cap_usd?: number;
    market_cap_inr?: number;
    ath_usd?: number;
    ath_inr?: number;
    atl_usd?: number;
    atl_inr?: number;
    usd_24h_change?: number;
    inr_24h_change?: number;
  }>;
  error?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TOKENS: { id: string; symbol: string; name: string }[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'tether', symbol: 'USDT', name: 'Tether' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin' },
];

export function LivePrices() {
  const { data, error, isLoading } = useSWR<PriceResponse>('/api/prices', fetcher, {
    refreshInterval: 60_000,
  });

  return (
    <section className="mx-auto max-w-7xl px-4 mt-12">
      <h2 className="text-xl font-semibold mb-4">Live Prices</h2>
      {isLoading ? (
        <div className="text-white/60">Loading prices…</div>
      ) : error || data?.error ? (
        <div className="text-red-400">Failed to load prices</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOKENS.map((t) => {
            const p = (data?.data as Record<string, any> | undefined)?.[t.id];
            return (
              <div key={t.id} className="card p-4 hover:shadow-lg hover:shadow-primary/10 transition-shadow">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm text-white/60">{t.name}</div>
                  <div className="text-xs text-white/50">{t.symbol}</div>
                </div>
                <div className="mt-2 text-2xl font-semibold">${p?.usd?.toLocaleString() ?? '--'}</div>
                <div className="text-sm text-white/70">₹{p?.inr?.toLocaleString() ?? '--'}</div>
                {typeof p?.usd_24h_change === 'number' && (
                  <div className={`mt-1 text-xs ${p.usd_24h_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{p.usd_24h_change.toFixed(2)}%</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default LivePrices;

