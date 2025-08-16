import crypto from 'crypto';

function verifyTelegramAuth(data: Record<string, string | number>): { valid: boolean; reason?: string } {
  if (process.env.TELEGRAM_AUTH_SKIP_VERIFY === 'true') {
    return { valid: true };
  }
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { valid: false, reason: 'missing_bot_token' };

  const receivedHash = String(data.hash || '').toLowerCase();
  const entries = Object.entries(data)
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secret).update(entries).digest('hex').toLowerCase();
  if (process.env.DEBUG_TELEGRAM_AUTH === 'true') {
    // eslint-disable-next-line no-console
    console.log('tg-auth verify', { entries, receivedHash, computed });
  }
  const ok = computed === receivedHash;
  if (!ok) return { valid: false, reason: 'hash_mismatch' };

  // Freshness window: 10 minutes
  const now = Math.floor(Date.now() / 1000);
  const authDate = Number(data.auth_date || 0);
  if (!Number.isFinite(authDate)) return { valid: false, reason: 'bad_auth_date' };
  if (now - authDate > 600) return { valid: false, reason: 'expired' };
  return { valid: true };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  if (process.env.DEBUG_TELEGRAM_AUTH === 'true') {
    // eslint-disable-next-line no-console
    console.log('tg-auth GET incoming', params);
  }
  const { valid, reason } = verifyTelegramAuth(params);

  const payload = valid
    ? {
        ok: true,
        user: {
          telegram_id: String(params.id || ''),
          username: params.username || null,
          first_name: params.first_name || null,
          last_name: params.last_name || null,
          photo_url: params.photo_url || null,
        },
      }
    : { ok: false };

  const html = `<!doctype html><html><body style="background:#0b1221;color:#e6edf3;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:grid;place-content:center;height:100vh;">
<div>Authentication ${valid ? 'successful' : 'failed'}${reason ? ' ('+reason+')' : ''}. You can close this window.</div>
<script>
  try { window.opener && window.opener.postMessage({ type: 'tg-auth', data: ${JSON.stringify(payload)} }, '*'); } catch (e) {}
  setTimeout(() => { window.close(); }, 500);
 </script></body></html>`;

  return new Response(html, { headers: { 'content-type': 'text/html' } });
}

