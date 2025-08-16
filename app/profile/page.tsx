"use client";
import { useEffect, useMemo, useState } from 'react';
import { fetchBaseBalance } from '@/lib/wallet';
import { supabaseBrowser } from '@/lib/supabaseClient';
import WalletConnect from '@/components/WalletConnect';
import SignInWithWallet from '@/components/SignInWithWallet';

type Trade = {
  id: string;
  token: string;
  side: 'buy' | 'sell';
  amount: number;
  price_usd: number;
  created_at: string;
};

export default function ProfilePage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    const client = supabaseBrowser();
    let cancel = false;
    const load = async () => {
      setLoading(true);
      try {
        const bal = await fetchBaseBalance(walletAddress as `0x${string}`);
        if (!cancel) setBalance(bal.etherFormatted);
      } catch (_) {
        if (!cancel) setBalance(null);
      }

      const { data: tradesData } = await client
        .from('trades')
        .select('id, token, side, amount, price_usd, created_at')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!cancel) setTrades((tradesData as unknown as Trade[]) ?? []);
      if (!cancel) setLoading(false);
    };
    load();
    return () => { cancel = true; };
  }, [walletAddress]);

  const tradeList = useMemo(() => (
    trades.length === 0 ? (
      <div className="text-white/60">No recent trades.</div>
    ) : (
      <ul className="divide-y divide-white/10">
        {trades.map(t => (
          <li key={t.id} className="py-2 text-sm flex items-center justify-between">
            <span className="text-white/80">{t.side.toUpperCase()} {t.amount} {t.token}</span>
            <span className="text-white/60">${t.price_usd.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    )
  ), [trades]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Your Profile</h1>
      <p className="text-white/60 mt-1">Sign in with your wallet to view your Base balance and recent trades.</p>

      {!walletAddress && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <WalletConnect onConnected={async (addr) => {
              try {
                await fetch('/api/user/upsert', {
                  method: 'POST', headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ wallet_address: addr })
                });
                setWalletAddress(addr);
                const bal = await fetchBaseBalance(addr);
                setBalance(bal.etherFormatted);
              } catch (_) {}
            }} />
            <SignInWithWallet onSignedIn={async (addr) => {
              try {
                await fetch('/api/user/upsert', {
                  method: 'POST', headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ wallet_address: addr })
                });
                setWalletAddress(addr);
                const bal = await fetchBaseBalance(addr);
                setBalance(bal.etherFormatted);
              } catch (_) {}
            }} />
          </div>
        </div>
      )}

      {walletAddress && (
        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Wallet</div>
              <div className="text-lg font-semibold">{walletAddress.slice(0,6)}…{walletAddress.slice(-4)}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="card p-4">
              <div className="font-semibold">Wallet</div>
              <div className="text-white/60 text-sm">Address: <span className="text-white/80">{walletAddress}</span></div>
              <div className="text-white/60 text-sm">Base Balance: <span className="text-white/80">{balance ?? (loading ? 'Loading…' : '—')}</span></div>
            </div>

            <div className="card p-4">
              <div className="font-semibold mb-2">Recent Trades</div>
              {loading ? <div className="text-white/60">Loading…</div> : tradeList}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

