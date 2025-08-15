"use client";
import { ReactNode, useMemo } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { base as baseChain } from '@/lib/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function Providers({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);
  const config = useMemo(() => createConfig({
    chains: [baseChain],
    connectors: [injected()],
    transports: { [baseChain.id]: http(baseChain.rpcUrls.default.http[0]) },
    multiInjectedProviderDiscovery: false,
  }), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

