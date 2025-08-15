import crypto from 'crypto';

function verifyTelegramAuth(data: Record<string, string | number>): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  const receivedHash = String(data.hash || '');
  const entries = Object.entries(data)
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secret).update(entries).digest('hex');
  return computed === receivedHash;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const valid = verifyTelegramAuth(params);

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
<div>Authentication ${valid ? 'successful' : 'failed'}. You can close this window.</div>
<script>
  try { window.opener && window.opener.postMessage({ type: 'tg-auth', data: ${JSON.stringify(payload)} }, '*'); } catch (e) {}
  setTimeout(() => { window.close(); }, 500);
 </script></body></html>`;

  return new Response(html, { headers: { 'content-type': 'text/html' } });
}

