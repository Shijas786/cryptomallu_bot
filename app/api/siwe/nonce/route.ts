import crypto from 'crypto';

export async function GET() {
  const nonce = crypto.randomBytes(16).toString('hex');
  const headers = new Headers({
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'set-cookie': `siwe_nonce=${nonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`,
  });
  return new Response(JSON.stringify({ nonce }), { headers });
}

