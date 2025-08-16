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
  const computed = crypto
    .createHmac('sha256', secret)
    .update(entries)
    .digest('hex')
    .toLowerCase();
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const raw = body?.authData && Object.keys(body.authData).length ? body.authData : query;
    const authData = raw ?? {};
    if (process.env.DEBUG_TELEGRAM_AUTH === 'true') {
      // eslint-disable-next-line no-console
      console.log('tg-auth POST incoming', { query, body: body?.authData || null });
    }
    const { valid, reason } = verifyTelegramAuth(authData);
    if (!valid) {
      return Response.json({ ok: false, error: 'Invalid auth', reason }, { status: 401 });
    }

    const { id, username, first_name, last_name, photo_url } = authData;
    return Response.json({
      ok: true,
      user: {
        telegram_id: String(id),
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        photo_url: photo_url || null,
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}

