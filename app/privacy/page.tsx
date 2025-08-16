export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-white/60 mt-2">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-invert mt-6">
        <h2>Overview</h2>
        <p>
          This Privacy Policy explains how Cryptomallu ("we", "our", or "us") collects, uses, and protects
          your information when you use our website, Telegram bot, and related services.
        </p>

        <h2>Information We Collect</h2>
        <ul>
          <li>
            <strong>Telegram account info</strong>: When you sign in with Telegram, we receive your Telegram ID,
            username, first/last name, and profile photo URL.
          </li>
          <li>
            <strong>Wallet information</strong>: If you link a wallet, we store the wallet address to show balances and
            facilitate escrow actions.
          </li>
          <li>
            <strong>Usage data</strong>: Basic analytics (pages visited, device/browser info) to improve the product.
          </li>
        </ul>

        <h2>How We Use Information</h2>
        <ul>
          <li>Authenticate you via the Telegram Login Widget.</li>
          <li>Link your Telegram account to your wallet to show balances and recent activity.</li>
          <li>Operate the P2P marketplace (e.g., posting/deleting ads) and escrow flows.</li>
          <li>Improve and secure the service, including preventing abuse.</li>
        </ul>

        <h2>Data Storage</h2>
        <p>
          We use Supabase to store user and marketplace data. Wallet balances may be queried via public RPC
          providers on the Base network. We do not store private keys.
        </p>

        <h2>Cookies</h2>
        <p>
          We may use essential cookies for session and security. Optional analytics cookies (if enabled) help us
          understand usage. You can control cookies via your browser settings.
        </p>

        <h2>Third Parties</h2>
        <ul>
          <li>Telegram Login Widget (for authentication)</li>
          <li>Supabase (database and APIs)</li>
          <li>CoinGecko (market data)</li>
          <li>RPC providers (e.g., Base RPC) for on-chain reads</li>
        </ul>

        <h2>Data Retention</h2>
        <p>
          We retain data for as long as needed to provide the service and comply with legal obligations. You may
          request deletion of your account data by contacting us.
        </p>

        <h2>Your Rights</h2>
        <p>
          You may request access, correction, or deletion of your personal information subject to applicable
          law. We will respond to reasonable requests in a timely manner.
        </p>

        <h2>Security</h2>
        <p>
          We apply reasonable technical and organizational measures to protect data. However, no internet or
          blockchain-based service is 100% secure. Use strong security practices and never share private keys.
        </p>

        <h2>Contact</h2>
        <p>
          Questions or requests? Contact us via Telegram at @Cryptomallu_bot or through the contact link in the
          footer.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy from time to time. Updates will be posted on this page with a new
          "Last updated" date.
        </p>
      </div>
    </div>
  );
}

