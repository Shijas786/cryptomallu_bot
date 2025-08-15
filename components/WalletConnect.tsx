"use client";
import { useAccount, useConnect, useDisconnect } from 'wagmi';

type Props = { onConnected?: (address: `0x${string}`) => void };

export default function WalletConnect({ onConnected }: Props) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    if (onConnected) onConnected(address as `0x${string}`);
    return (
      <div className="flex items-center gap-2">
        <span className="text-white/80 text-sm">{shorten(address)}</span>
        <button className="btn btn-outline" onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  const injected = connectors.find(c => c.id === 'injected');
  return (
    <button className="btn btn-primary" onClick={() => injected && connect({ connector: injected })} disabled={isPending}>
      {isPending ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}

function shorten(addr: string) {
  return `${addr.slice(0,6)}…${addr.slice(-4)}`;
}

