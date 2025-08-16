"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import TelegramLogin from '@/components/TelegramLogin';
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
  const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'Cryptomallu_bot';
  const [tgUser, setTgUser] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [myAds, setMyAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const onTelegramAuth = useCallback((user: any) => {
    setTgUser(user);
  }, []);

  useEffect(() => {
    if (!tgUser) return;
    // Upsert user record so bot/site share a single account
    (async () => {
      try {
        await fetch('/api/user/upsert', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ telegram_id: tgUser.telegram_id, username: tgUser.username }),
        });
        await fetch('/api/user/provision', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ telegram_id: tgUser.telegram_id, username: tgUser.username }),
        });
      } catch (_) {}
    })();
    const client = supabaseBrowser();
    let cancel = false;
    const load = async () => {
      setLoading(true);
      // Fetch linked wallet address from users table using Telegram ID
      const { data: users } = await client
        .from('users')
        .select('wallet_address')
        .eq('telegram_id', tgUser.telegram_id)
        .limit(1);

      const wa = users?.[0]?.wallet_address as string | undefined;
      if (!cancel) {
        setWalletAddress(wa ?? null);
      }

      if (wa) {
        try {
          const bal = await fetchBaseBalance(wa as `0x${string}`);
          if (!cancel) setBalance(bal.etherFormatted);
        } catch (_) {
          if (!cancel) setBalance(null);
        }

        const { data: tradesData } = await client
          .from('trades')
          .select('id, token, side, amount, price_usd, created_at')
          .eq('wallet_address', wa)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!cancel) setTrades((tradesData as unknown as Trade[]) ?? []);
      }

      // Load my active ads by telegram id
      if (tgUser?.telegram_id) {
        const { data: adsData } = await client
          .from('ads')
          .select('id, type, token, price_usd, price_inr, amount, payment_method, created_at')
          .eq('posted_by', tgUser.telegram_id)
          .order('created_at', { ascending: false });
        if (!cancel) setMyAds((adsData as any[]) || []);
      }
      if (!cancel) setLoading(false);
    };
    load();
    return () => { cancel = true; };
  }, [tgUser]);

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
      <p className="text-white/60 mt-1">Login with Telegram. If your wallet is linked in the bot, we will show Base balance and last trades.</p>

      {!tgUser && (
        <div className="mt-6 space-y-4">
          <TelegramLogin botUsername={BOT_USERNAME} onAuth={onTelegramAuth} />
          <div className="text-white/60 text-sm">Or</div>
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
          {walletAddress && (
            <div className="card p-4">
              <div className="font-semibold">Wallet</div>
              <div className="text-white/60 text-sm">Address: <span className="text-white/80">{walletAddress}</span></div>
              <div className="text-white/60 text-sm">Base Balance: <span className="text-white/80">{balance ?? (loading ? 'Loading…' : '—')}</span></div>
            </div>
          )}
        </div>
      )}

      {tgUser && (
        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Telegram</div>
              <div className="text-lg font-semibold">@{tgUser.username || tgUser.first_name}</div>
            </div>
            <div className="flex items-center gap-3">
              <WalletConnect onConnected={async (addr) => {
                try {
                  await fetch('/api/user/upsert', {
                    method: 'POST', headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ telegram_id: tgUser.telegram_id, wallet_address: addr })
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
                    body: JSON.stringify({ telegram_id: tgUser.telegram_id, wallet_address: addr })
                  });
                  setWalletAddress(addr);
                  const bal = await fetchBaseBalance(addr);
                  setBalance(bal.etherFormatted);
                } catch (_) {}
              }} />
              <a className="btn btn-outline" href={`https://t.me/${BOT_USERNAME}`} target="_blank" rel="noreferrer">Open Bot</a>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="card p-4">
              <div className="font-semibold">Wallet</div>
              <div className="text-white/60 text-sm">Address: <span className="text-white/80">{walletAddress ?? 'Not linked'}</span></div>
              <div className="text-white/60 text-sm">Base Balance: <span className="text-white/80">{balance ?? (loading ? 'Loading…' : '—')}</span></div>
            </div>

            <div className="card p-4">
              <div className="font-semibold mb-2">Recent Trades</div>
              {loading ? <div className="text-white/60">Loading…</div> : tradeList}
            </div>

            <div className="card p-4">
              <div className="font-semibold mb-2">Your Active Ads</div>
              {loading ? (
                <div className="text-white/60">Loading…</div>
              ) : myAds.length === 0 ? (
                <div className="text-white/60">No active ads.</div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {myAds.map((ad) => (
                    <li key={ad.id} className="py-2 flex items-center justify-between text-sm">
                      <span className="text-white/80">{ad.type.toUpperCase()} {ad.amount} {ad.token} @ ${ad.price_usd}</span>
                      <button
                        className="btn btn-outline"
                        onClick={async () => {
                          try {
                            await fetch('/api/ads/delete', {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ ad_id: ad.id, telegram_id: tgUser.telegram_id }),
                            });
                            setMyAds((list) => list.filter((x) => x.id !== ad.id));
                          } catch (_) {}
                        }}
                      >Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

