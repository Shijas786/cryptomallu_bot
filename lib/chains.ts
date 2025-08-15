import { defineChain } from 'viem';

const alchemy = process.env.NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL;
export const base = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [alchemy || 'https://mainnet.base.org'] },
    public: { http: [alchemy || 'https://mainnet.base.org'] },
  },
});

