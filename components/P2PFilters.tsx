"use client";
import { useMemo } from 'react';

export type Filters = {
  side: 'buy' | 'sell' | 'all';
  token: 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'ALL';
  minPrice?: number;
  maxPrice?: number;
  payment?: string;
};

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  availablePayments: string[];
};

export default function P2PFilters({ filters, onChange, availablePayments }: Props) {
  const payments = useMemo(() => ['Any', ...availablePayments], [availablePayments]);

  return (
    <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
      <select
        className="bg-transparent border border-white/20 rounded-lg px-3 py-2"
        value={filters.side}
        onChange={(e) => onChange({ ...filters, side: e.target.value as Filters['side'] })}
      >
        <option value="all">All</option>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>

      <select
        className="bg-transparent border border-white/20 rounded-lg px-3 py-2"
        value={filters.token}
        onChange={(e) => onChange({ ...filters, token: e.target.value as Filters['token'] })}
      >
        <option value="ALL">All Tokens</option>
        <option value="BTC">BTC</option>
        <option value="ETH">ETH</option>
        <option value="USDT">USDT</option>
        <option value="USDC">USDC</option>
      </select>

      <input
        type="number"
        placeholder="Min Price (USD)"
        className="bg-transparent border border-white/20 rounded-lg px-3 py-2"
        value={filters.minPrice ?? ''}
        onChange={(e) => onChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })}
      />

      <input
        type="number"
        placeholder="Max Price (USD)"
        className="bg-transparent border border-white/20 rounded-lg px-3 py-2"
        value={filters.maxPrice ?? ''}
        onChange={(e) => onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
      />

      <select
        className="bg-transparent border border-white/20 rounded-lg px-3 py-2"
        value={filters.payment ?? 'Any'}
        onChange={(e) => onChange({ ...filters, payment: e.target.value === 'Any' ? undefined : e.target.value })}
      >
        {payments.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}

