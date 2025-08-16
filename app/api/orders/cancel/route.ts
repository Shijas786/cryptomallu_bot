import { supabaseServer } from '@/lib/supabaseServer';

type Body = { order_id: string; wallet_address?: string; telegram_id?: string };

export async function POST(req: Request) {
  try {
    const { order_id, wallet_address, telegram_id } = (await req.json()) as Body;
    if (!order_id) return Response.json({ ok: false, error: 'Missing order_id' }, { status: 400 });
    if (!wallet_address && !telegram_id) return Response.json({ ok: false, error: 'Missing identity' }, { status: 400 });

    const supabase = supabaseServer();
    const { data: order, error: selErr } = await supabase
      .from('orders')
      .select('id, status, buyer_id, seller_id')
      .eq('id', order_id)
      .single();
    if (selErr || !order) return Response.json({ ok: false, error: 'Order not found' }, { status: 404 });

    let allowedIds = new Set<string>();
    if (wallet_address) {
      allowedIds.add(String(wallet_address));
      // also consider case variants
      allowedIds.add(String(wallet_address).toLowerCase());
      allowedIds.add(String(wallet_address).toUpperCase());
      const { data: me } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('wallet_address', wallet_address)
        .limit(1);
      const linkedTg = me?.[0]?.telegram_id as string | undefined;
      if (linkedTg) allowedIds.add(String(linkedTg));
    }
    if (telegram_id) allowedIds.add(String(telegram_id));

    if (!allowedIds.has(String(order.buyer_id)) && !allowedIds.has(String(order.seller_id))) {
      return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const status = String(order.status || '').toLowerCase();
    const cancellable = ['pending', 'paid', 'matched'].includes(status);
    if (!cancellable) return Response.json({ ok: false, error: 'Not cancellable' }, { status: 409 });

    const { error: updErr } = await supabase
      .from('orders')
      .update({ status: 'canceled' })
      .eq('id', order_id);
    if (updErr) return Response.json({ ok: false, error: updErr.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}

