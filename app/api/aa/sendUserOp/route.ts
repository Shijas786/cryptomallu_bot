// Minimal proxy to Alchemy bundler endpoint for sending a prebuilt UserOperation.
// Client must build & sign the UserOperation client-side or in a secure server flow.

export async function POST(request: Request) {
  try {
    const bundler = process.env.ALCHEMY_BUNDLER_URL;
    if (!bundler) return Response.json({ ok: false, error: 'Bundler not configured' }, { status: 400 });

    const body = await request.json();
    const res = await fetch(bundler, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}

