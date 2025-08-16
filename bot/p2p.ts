import { makeSupabase, type Ctx } from './commands';

export type OrderStatus = 'pending' | 'matched' | 'paid' | 'released' | 'canceled' | 'disputed';

export async function startOrder(ctx: Ctx, adId: string) {
  const supabase = makeSupabase();
  if (!supabase) return ctx.reply('Supabase not configured.');
  try {
    const { data: ad, error: adErr } = await supabase
      .from('ads')
      .select('id, type, token, price_usd, amount, payment_method, posted_by')
      .eq('id', adId)
      .single();
    if (adErr || !ad) return ctx.reply('Ad not found.');

    const isBuyer = ad.type === 'sell';
    const buyerId = isBuyer ? String(ctx.from.id) : String(ad.posted_by);
    const sellerId = isBuyer ? String(ad.posted_by) : String(ctx.from.id);

    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .insert({
        ad_id: ad.id,
        token: ad.token,
        unit_price: ad.price_usd,
        amount: ad.amount,
        fiat_method: ad.payment_method,
        buyer_id: buyerId,
        seller_id: sellerId,
        status: 'pending' as OrderStatus,
      } as any)
      .select('id')
      .single();

    if (ordErr) {
      return ctx.reply('Orders table missing. Please add it in Supabase. SQL:\n\n' + getOrdersSql());
    }

    const lines = [
      `Order #${order.id} created`,
      `${isBuyer ? 'Buyer' : 'Seller'}: @${ctx.from.username || ctx.from.id}`,
      `Token: ${ad.token} • Amount: ${ad.amount} • Price: $${ad.price_usd}`,
      `Payment: ${ad.payment_method}`,
      `Status: pending`,
    ].join('\n');

    return ctx.reply(lines, {
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Mark Paid', callback_data: `order:paid:${order.id}` },
          { text: '🔓 Release', callback_data: `order:release:${order.id}` },
        ], [
          { text: '❌ Cancel', callback_data: `order:cancel:${order.id}` },
          { text: '⚠️ Dispute', callback_data: `order:dispute:${order.id}` },
        ]],
      },
    });
  } catch (e) {
    return ctx.reply('Failed to start order.');
  }
}

export async function markPaid(ctx: Ctx, orderId: string) {
  return updateOrderStatus(ctx, orderId, 'paid');
}

export async function release(ctx: Ctx, orderId: string) {
  return updateOrderStatus(ctx, orderId, 'released');
}

export async function cancel(ctx: Ctx, orderId: string) {
  return updateOrderStatus(ctx, orderId, 'canceled');
}

export async function dispute(ctx: Ctx, orderId: string) {
  return updateOrderStatus(ctx, orderId, 'disputed');
}

async function updateOrderStatus(ctx: Ctx, orderId: string, next: OrderStatus) {
  const supabase = makeSupabase();
  if (!supabase) return ctx.reply('Supabase not configured.');
  try {
    const { data: order, error: selErr } = await supabase
      .from('orders')
      .select('id, status, buyer_id, seller_id, ad_id')
      .eq('id', orderId)
      .single();
    if (selErr || !order) return ctx.reply('Order not found.');

    const actor = String(ctx.from.id);
    const isParty = actor === String(order.buyer_id) || actor === String(order.seller_id);
    if (!isParty) return ctx.reply('You are not a party in this order.');

    const allowed = allowedTransition(order.status as OrderStatus, next, actor, String(order.seller_id));
    if (!allowed) return ctx.reply('Action not allowed for current status.');

    const { error: updErr } = await supabase
      .from('orders')
      .update({ status: next as any })
      .eq('id', order.id);
    if (updErr) return ctx.reply('Failed to update order.');

    // Optional: if released, you could also delete the ad here or mark fulfilled
    if (next === 'released') {
      await supabase.from('ads').update({ status: 'fulfilled' } as any).eq('id', order.ad_id).catch(() => {});
    }
    return ctx.reply(`Order #${order.id} → ${next}`);
  } catch (e) {
    return ctx.reply('Order update failed.');
  }
}

function allowedTransition(current: OrderStatus, next: OrderStatus, actor: string, sellerId: string) {
  const isSeller = actor === sellerId;
  if (current === 'pending' && next === 'paid') return true; // buyer marks paid
  if (current === 'paid' && next === 'released') return isSeller; // seller releases
  if (['pending', 'paid', 'matched'].includes(current) && next === 'canceled') return true; // either may cancel
  if (['pending', 'paid', 'matched'].includes(current) && next === 'disputed') return true;
  return false;
}

export function getOrdersSql() {
  return `
-- Minimal orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  ad_id text not null,
  buyer_id text not null,
  seller_id text not null,
  token text not null,
  unit_price numeric not null,
  amount numeric not null,
  fiat_method text,
  status text not null default 'pending',
  created_at timestamp with time zone default now()
);
`;
}

