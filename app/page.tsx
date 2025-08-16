import LivePrices from '@/components/LivePrices';

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Kerala’s AI‑Powered P2P Crypto Marketplace on Base
            </h1>
            <p className="mt-4 text-white/70 max-w-xl">
              Buy and sell crypto with confidence. Lock funds in smart‑contract escrow and settle fast with local payments.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a className="btn btn-primary" href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'Cryptomallu_bot'}`} target="_blank" rel="noreferrer">Start on Telegram</a>
              <a className="btn btn-outline" href="/p2p">Browse Ads</a>
            </div>
          </div>
          <div>
            <div className="card p-6">
              <div className="text-sm text-white/70">Escrow on Base</div>
              <div className="mt-2 text-4xl font-bold">Secure, Permit2‑Powered Escrow</div>
              <div className="mt-4 text-white/60 text-sm">
                Funds are locked in escrow until both parties confirm for transparent on‑chain settlement.
              </div>
            </div>
          </div>
        </div>
      </section>

      <LivePrices />

      <section className="mx-auto max-w-7xl px-4 mt-16">
        <h2 className="text-xl font-semibold mb-6">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-lg font-semibold">1. Browse Ads</div>
            <p className="text-white/70 mt-2">Find the best rates and payment methods for your preferred token.</p>
          </div>
          <div className="card p-5">
            <div className="text-lg font-semibold">2. Lock in Escrow</div>
            <p className="text-white/70 mt-2">Funds are secured on Base until the trade completes.</p>
          </div>
          <div className="card p-5">
            <div className="text-lg font-semibold">3. Release Funds</div>
            <p className="text-white/70 mt-2">Once both parties confirm, escrow releases to the buyer.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 mt-16">
        <h2 className="text-xl font-semibold mb-4">Security</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-white/80">
          <li className="card p-4">Gasless Escrow on Base</li>
          <li className="card p-4">Admin Dispute Resolution</li>
          
        </ul>
      </section>
    </div>
  );
}

