# Cryptomallu

Kerala First AI-Powered P2P Crypto Marketplace on Base. Next.js App Router + TailwindCSS + Supabase.

## Features
- Landing page with hero, live prices (CoinGecko), how-it-works, and security sections
- P2P marketplace with filters, Supabase integration, and Telegram deep links
- Profile page with wallet-connect placeholder (ready for Privy/RainbowKit + Biconomy)
- API route `/api/prices` with 60s revalidate

## Environment
Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TELEGRAM_BOT_TOKEN=
# Server-only (required for posting ads via API)
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL=
ALCHEMY_BUNDLER_URL= # e.g. https://base-mainnet.g.alchemy.com/aa <full JSON-RPC AA endpoint>
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=Cryptomallu_bot
```

## Getting Started

```
npm install
npm run dev
```

Open http://localhost:3000

## Deploy
Deploy to Vercel. Add the two env vars in Project Settings → Environment Variables.

## Gasless (Alchemy AA)
- Add `ALCHEMY_BUNDLER_URL` for your Alchemy Account Abstraction bundler endpoint.
- `POST /api/aa/sendUserOp` proxies requests to the bundler. Build/sign the UserOperation in your bot or site and submit via this endpoint for sponsorship.
- `GET /api/aa/check` returns whether bundler is configured.

## Post Ads from website
- Endpoint: `POST /api/ads`
- Requires `SUPABASE_SERVICE_ROLE_KEY` set on the server (do not expose on client). In Vercel, set as an Environment Variable.
- Body:
```json
{
  "type": "buy|sell",
  "token": "BTC|ETH|USDT|USDC",
  "price_usd": 1,
  "price_inr": 83,
  "amount": 100,
  "payment_method": "UPI",
  "posted_by": "optional telegram username or wallet"
}
```

### Delete ads
- Endpoint: `POST /api/ads/delete`
- Body: `{ ad_id, telegram_id }` — only deletes if `ads.posted_by === telegram_id`
- After a trade completes, your bot or backend should call this endpoint (or delete directly in Supabase) so the ad disappears from the marketplace. Trade remains in `trades` for history.

## Supabase schema
- Table `users`: add columns `telegram_id TEXT`, `wallet_address TEXT`, `upi_id TEXT`, `reputation_score NUMERIC`.
- Table `trades`: minimal example
  - `id UUID primary key`
  - `wallet_address TEXT`
  - `token TEXT`
  - `side TEXT` (buy/sell)
  - `amount NUMERIC`
  - `price_usd NUMERIC`
  - `created_at TIMESTAMP DEFAULT now()`

Link a Telegram user to a wallet by saving their `telegram_id` and `wallet_address` in `users`. The profile page will show Base balance (via viem) and last 10 trades from `trades`.
