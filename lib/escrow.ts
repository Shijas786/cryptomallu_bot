export const BASE_PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

export const BASE_TOKENS = {
	USDT: '0xfde4C96c8593536E31F229EA8f37B2ADa2699bB2',
	USDC: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
} as const;

export const ESCROW_ARBITER = '0xe58E4ee5da1eBCB16869F8672C96D13EE83bC182';
export const ESCROW_FEE_BPS = 10; // 0.1%

export function getAllowedTokenAddress(symbol: 'USDT' | 'USDC'): string {
	return BASE_TOKENS[symbol];
}

