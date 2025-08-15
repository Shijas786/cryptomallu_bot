import { createPublicClient, formatEther, http } from 'viem';
import { base } from '@/lib/chains';

export async function fetchBaseBalance(address: `0x${string}`) {
  const client = createPublicClient({ chain: base, transport: http() });
  const balance = await client.getBalance({ address });
  return {
    wei: balance,
    etherFormatted: formatEther(balance),
  };
}

