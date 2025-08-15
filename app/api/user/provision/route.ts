import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegram_id, username } = body || {};
    if (!telegram_id) return Response.json({ ok: false, error: 'telegram_id required' }, { status: 400 });

    const supabase = supabaseServer();
    const { data: existing } = await supabase.from('users').select('id, wallet_address').eq('telegram_id', telegram_id).limit(1);
    const current = existing?.[0];
    if (current?.wallet_address) {
      return Response.json({ ok: true, wallet_address: current.wallet_address });
    }

    // Without Biconomy, do not create a new SCA. Just return existing or null.
    const { data, error } = await supabase
      .from('users')
      .upsert({ telegram_id, username: username ?? null }, { onConflict: 'telegram_id' })
      .select('wallet_address')
      .single();

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true, wallet_address: data.wallet_address });
  } catch (e) {
    return Response.json({ ok: false, error: 'bad request' }, { status: 400 });
  }
}

