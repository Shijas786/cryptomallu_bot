import { supabaseServer } from '@/lib/supabaseServer';
import { SiweMessage } from 'siwe';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, signature } = body || {};
    if (!message || !signature) {
      return Response.json({ ok: false, error: 'message and signature required' }, { status: 400 });
    }

    const cookie = req.headers.get('cookie') || '';
    const nonceMatch = cookie.match(/(?:^|; )siwe_nonce=([^;]+)/);
    const nonce = nonceMatch ? decodeURIComponent(nonceMatch[1]) : undefined;
    if (!nonce) return Response.json({ ok: false, error: 'missing nonce cookie' }, { status: 400 });

    const siwe = new SiweMessage(message);
    const fields = await siwe.verify({ signature, nonce });
    if (!fields.success) {
      return Response.json({ ok: false, error: 'invalid siwe' }, { status: 401 });
    }

    const address = siwe.address as `0x${string}`;

    const supabase = supabaseServer();
    const { data: existing } = await supabase
      .from('users')
      .select('id, telegram_id')
      .eq('wallet_address', address)
      .limit(1);

    let userId = existing?.[0]?.id as string | undefined;
    if (!userId) {
      const { data: inserted, error } = await supabase
        .from('users')
        .insert({ wallet_address: address })
        .select('id')
        .single();
      if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
      userId = inserted?.id as string;
    }

    const headers = new Headers({ 'content-type': 'application/json' });
    headers.append('set-cookie', 'siwe_nonce=; Path=/; Max-Age=0');
    return new Response(JSON.stringify({ ok: true, address }), { headers });
  } catch (e) {
    return Response.json({ ok: false, error: 'bad request' }, { status: 400 });
  }
}

