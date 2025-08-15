export const revalidate = 60;

const IDS = ['bitcoin', 'ethereum', 'tether', 'usd-coin'];

type MarketsResponse = Array<{
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  ath: number;
  atl: number;
  price_change_percentage_24h?: number;
}>;

export async function GET() {
  try {
    const [usdRes, inrRes] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${IDS.join(',')}&price_change_percentage=24h&precision=2`, { next: { revalidate }, headers: { accept: 'application/json' } }),
      fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&ids=${IDS.join(',')}&price_change_percentage=24h&precision=2`, { next: { revalidate }, headers: { accept: 'application/json' } }),
    ]);

    if (!usdRes.ok || !inrRes.ok) {
      return Response.json({ error: 'Failed to fetch prices' }, { status: 502 });
    }

    const [usdData, inrData] = (await Promise.all([usdRes.json(), inrRes.json()])) as [MarketsResponse, MarketsResponse];

    const byIdUsd = Object.fromEntries(usdData.map((c) => [c.id, c]));
    const byIdInr = Object.fromEntries(inrData.map((c) => [c.id, c]));

    const data = Object.fromEntries(
      IDS.map((id) => {
        const u = byIdUsd[id];
        const i = byIdInr[id];
        return [id, {
          usd: u?.current_price ?? null,
          inr: i?.current_price ?? null,
          market_cap_usd: u?.market_cap ?? null,
          market_cap_inr: i?.market_cap ?? null,
          ath_usd: u?.ath ?? null,
          ath_inr: i?.ath ?? null,
          atl_usd: u?.atl ?? null,
          atl_inr: i?.atl ?? null,
          usd_24h_change: u?.price_change_percentage_24h ?? null,
          inr_24h_change: i?.price_change_percentage_24h ?? null,
        }];
      })
    );

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

