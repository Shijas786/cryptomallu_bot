import './globals.css';
import type { ReactNode } from 'react';
import Providers from './providers';

export const metadata = {
  title: 'Cryptomallu — Kerala First AI-Powered P2P Crypto Marketplace on Base',
  description: 'Browse P2P ads, view live crypto prices, and start trades via our Telegram bot.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0B1221] via-[#0b1221] to-[#0d1426] text-foreground antialiased">
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'url(/base-watermark.svg)', backgroundRepeat: 'no-repeat', backgroundPosition: 'right -100px top -80px', backgroundSize: '700px 700px' }} />
        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Cryptomallu" className="h-8 w-8 rounded-full border border-white/10" />
              <span className="text-lg font-semibold tracking-tight">Cryptomallu</span>
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a className="hover:text-primary transition-colors" href="/p2p">P2P</a>
              <a className="hover:text-primary transition-colors" href="/profile">Profile</a>
              <a className="hover:text-primary transition-colors" href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'Cryptomallu_bot'}`} target="_blank" rel="noreferrer">Telegram</a>
            </nav>
          </div>
        </header>
        <main className="relative z-10"><Providers>{children}</Providers></main>
        <footer className="relative z-10 border-t border-white/10 mt-16">
          <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <div className="font-semibold mb-2">Cryptomallu</div>
              <p className="text-white/60">Kerala First AI-Powered P2P Crypto Marketplace on Base.</p>
            </div>
            <div>
              <div className="font-semibold mb-2">Links</div>
              <ul className="space-y-1 text-white/80">
                <li><a className="hover:text-primary" href="/">Home</a></li>
                <li><a className="hover:text-primary" href="/p2p">P2P Marketplace</a></li>
                <li><a className="hover:text-primary" href="/profile">Profile</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Legal</div>
              <ul className="space-y-1 text-white/80">
                <li><a className="hover:text-primary" href="#">About</a></li>
                <li><a className="hover:text-primary" href="#">Contact</a></li>
                <li><a className="hover:text-primary" href="#">Terms</a></li>
                <li><a className="hover:text-primary" href="#">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 pb-8 text-xs text-white/50">© {new Date().getFullYear()} Cryptomallu. All rights reserved.</div>
        </footer>
      </body>
    </html>
  );
}

