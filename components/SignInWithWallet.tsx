"use client";
import { useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

export default function SignInWithWallet({ onSignedIn }: { onSignedIn?: (address: `0x${string}`) => void }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const domain = typeof window !== 'undefined' ? window.location.host : '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const chainId = 8453; // Base

  const statement = useMemo(() => 'Sign in with Ethereum to Cryptomallu.', []);

  async function handleSiwe() {
    try {
      setLoading(true);
      setError(null);
      if (!isConnected || !address) throw new Error('Connect wallet first');

      const nonceRes = await fetch('/api/siwe/nonce', { cache: 'no-store' });
      const { nonce } = await nonceRes.json();
      if (!nonce) throw new Error('Failed to get nonce');

      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        `${address}`,
        ``,
        `${statement}`,
        ``,
        `URI: ${origin}`,
        `Version: 1`,
        `Chain ID: ${chainId}`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join('\n');

      const signature = await signMessageAsync({ message });
      const verifyRes = await fetch('/api/siwe/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok || !data?.ok) throw new Error(data?.error || 'Verify failed');
      if (onSignedIn) onSignedIn(address as `0x${string}`);
    } catch (e: any) {
      setError(e?.message || 'SIWE failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-outline" onClick={handleSiwe} disabled={loading || !isConnected}>
        {loading ? 'Signing…' : 'Sign in with Wallet'}
      </button>
      {error && <span className="text-red-400 text-sm">{error}</span>}
    </div>
  );
}

