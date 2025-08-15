import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      telegram_id,
      username,
      wallet_address,
      upi_id,
    }: { telegram_id?: string; username?: string; wallet_address?: string; upi_id?: string } = body || {};

    if (!telegram_id && !wallet_address) {
      return Response.json({ ok: false, error: 'telegram_id or wallet_address required' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Upsert on (telegram_id) or (wallet_address) to unify account
    const payload = {
      telegram_id: telegram_id ?? null,
      username: username ?? null,
      wallet_address: wallet_address ?? null,
      upi_id: upi_id ?? null,
    } as const;

    let targetQuery = supabase.from('users');

    // Try to find existing by wallet or telegram
    const { data: foundByWallet } = wallet_address
      ? await targetQuery.select('id').eq('wallet_address', wallet_address).limit(1)
      : { data: null } as any;
    const { data: foundByTelegram } = telegram_id
      ? await targetQuery.select('id').eq('telegram_id', telegram_id).limit(1)
      : { data: null } as any;

    const existingId = (foundByWallet?.[0]?.id ?? foundByTelegram?.[0]?.id) as string | undefined;

    let result;
    if (existingId) {
      result = await supabase.from('users').update(payload).eq('id', existingId).select('*').single();
    } else {
      result = await supabase.from('users').insert(payload).select('*').single();
    }

    if (result.error) {
      return Response.json({ ok: false, error: result.error.message }, { status: 500 });
    }

    return Response.json({ ok: true, user: result.data });
  } catch (e) {
    return Response.json({ ok: false, error: 'bad request' }, { status: 400 });
  }
}

