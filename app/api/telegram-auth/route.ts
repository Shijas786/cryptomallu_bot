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
  const computed = crypto
    .createHmac('sha256', secret)
    .update(entries)
    .digest('hex');

  return computed === receivedHash;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authData = body?.authData ?? {};
    if (!verifyTelegramAuth(authData)) {
      return Response.json({ ok: false, error: 'Invalid auth' }, { status: 401 });
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

