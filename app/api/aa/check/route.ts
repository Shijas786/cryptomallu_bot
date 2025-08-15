export async function GET() {
  const url = process.env.ALCHEMY_BUNDLER_URL;
  return Response.json({ ok: Boolean(url), bundlerConfigured: Boolean(url) });
}

