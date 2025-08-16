"use client";
import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { erc20Abi, maxUint256, parseUnits } from 'viem';
import WalletConnect from '@/components/WalletConnect';
import { BASE_PERMIT2_ADDRESS, BASE_TOKENS, ESCROW_ARBITER, ESCROW_FEE_BPS } from '@/lib/escrow';

type Props = { adId: string };

export default function EscrowPanel({ adId }: Props) {
  const [token, setToken] = useState<'USDT' | 'USDC'>('USDT');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.includes('escrow')) {
      // could pre-fill from ad if needed via API
    }
  }, []);

  const tokenAddr = useMemo(() => BASE_TOKENS[token], [token]);

  async function handleCreateAndFund() {
    try {
      setSubmitting(true);
      setError(null);
      setStatus('Preparing transaction…');
      if (!isConnected || !address) throw new Error('Connect your wallet first');
      if (!amount || Number(amount) <= 0) throw new Error('Enter a valid amount');
      if (!publicClient) throw new Error('No client');

      const decimals = await publicClient.readContract({
        address: tokenAddr as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals',
      }) as number;
      const amountParsed = parseUnits(amount, decimals);

      setStatus('Checking token allowance to Permit2…');
      const currentAllowance = await publicClient.readContract({
        address: tokenAddr as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, BASE_PERMIT2_ADDRESS as `0x${string}`],
      }) as bigint;

      if (currentAllowance < amountParsed) {
        setStatus('Approving Permit2 to move your tokens (one-time)…');
        const approveHash = await writeContractAsync({
          address: tokenAddr as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [BASE_PERMIT2_ADDRESS as `0x${string}`, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setStatus('Setting Permit2 allowance for escrow…');
      const expiration = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      const PERMIT2_ABI = [
        {
          inputs: [
            { internalType: 'address', name: 'token', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint160', name: 'amount', type: 'uint160' },
            { internalType: 'uint48', name: 'expiration', type: 'uint48' },
          ],
          name: 'approve',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'token', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
          ],
          name: 'allowance',
          outputs: [
            { internalType: 'uint160', name: 'amount', type: 'uint160' },
            { internalType: 'uint48', name: 'expiration', type: 'uint48' },
            { internalType: 'uint48', name: 'nonce', type: 'uint48' },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      ] as const;

      const [p2Amount] = (await publicClient.readContract({
        address: BASE_PERMIT2_ADDRESS as `0x${string}`,
        abi: PERMIT2_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, tokenAddr as `0x${string}`, ESCROW_ARBITER as `0x${string}`],
      })) as unknown as [bigint, bigint, bigint];

      if (p2Amount < amountParsed) {
        const approvePermit2Hash = await writeContractAsync({
          address: BASE_PERMIT2_ADDRESS as `0x${string}`,
          abi: PERMIT2_ABI,
          functionName: 'approve',
          args: [tokenAddr as `0x${string}`, ESCROW_ARBITER as `0x${string}`, amountParsed, expiration],
        });
        await publicClient.waitForTransactionReceipt({ hash: approvePermit2Hash });
      }

      setStatus('Ready. Escrow can now pull funds via Permit2.');
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || 'Failed to fund via Permit2');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Create Escrow (Base)</h2>
        <span className="text-white/60">Arbiter: {ESCROW_ARBITER.slice(0,6)}…{ESCROW_ARBITER.slice(-4)} • Fee {(ESCROW_FEE_BPS/100).toFixed(2)}%</span>
      </div>
      <div className="mt-3">
        <WalletConnect />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col">
          <span className="text-sm text-white/60">Token</span>
          <select className="bg-transparent border border-white/10 rounded px-2 py-2" value={token} onChange={e => setToken(e.target.value as any)}>
            <option value="USDT">USDT</option>
            <option value="USDC">USDC</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-sm text-white/60">Amount</span>
          <input className="bg-transparent border border-white/10 rounded px-2 py-2" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col">
          <span className="text-sm text-white/60">Permit2</span>
          <input className="bg-transparent border border-white/10 rounded px-2 py-2" value={BASE_PERMIT2_ADDRESS} readOnly />
        </label>
      </div>
      <div className="mt-4 text-white/60 text-sm">Token address: {tokenAddr}</div>
      <div className="mt-2 text-white/60 text-sm">Spender (escrow): {ESCROW_ARBITER.slice(0,6)}…{ESCROW_ARBITER.slice(-4)}</div>
      <div className="mt-4 flex gap-3">
        <button className="rounded bg-blue-600 px-3 py-2" onClick={handleCreateAndFund} disabled={submitting}>{submitting ? 'Processing…' : 'Create & Fund Escrow'}</button>
        <a className="rounded bg-white/10 px-3 py-2" href={`https://basescan.org/address/${tokenAddr}`} target="_blank">View Token</a>
      </div>
      {status && <div className="mt-3 text-sm text-white/70">{status}</div>}
      {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
    </div>
  );
}

