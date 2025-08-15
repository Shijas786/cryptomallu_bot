import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

export type Ctx = {
  reply: (text: string, extra?: any) => Promise<any>;
  from: { id: number; username?: string | undefined };
};

export function makeSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

export async function cmdPrices(ctx: Ctx) {
  try {
    const res = await fetch(`${process.env.WEB_URL || 'http://localhost:3000'}/api/prices`);
    const json = await res.json();
    const d = json.data || {};
    const fmt = (id: string, sym: string) => {
      const x = d[id];
      if (!x) return `${sym}: n/a`;
      return `${sym}: $${x.usd} | ₹${x.inr}`;
    };
    const lines = [
      fmt('bitcoin', 'BTC'),
      fmt('ethereum', 'ETH'),
      fmt('tether', 'USDT'),
      fmt('usd-coin', 'USDC'),
    ].join('\n');
    await ctx.reply(`Live Prices (CoinGecko)\n${lines}`);
  } catch (e) {
    await ctx.reply('Failed to fetch prices.');
  }
}

export async function cmdMyAds(ctx: Ctx) {
  const supabase = makeSupabase();
  if (!supabase) return ctx.reply('Supabase not configured.');
  const { data, error } = await supabase
    .from('ads')
    .select('id, type, token, price_usd, amount, payment_method, created_at')
    .eq('posted_by', String(ctx.from.id))
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return ctx.reply('Error loading your ads.');
  if (!data || data.length === 0) return ctx.reply('You have no active ads.');
  const lines = data.map(a => `${a.type.toUpperCase()} ${a.token} $${a.price_usd} x ${a.amount} (${a.payment_method})\n/start ${a.id}`).join('\n\n');
  return ctx.reply(`Your last ads:\n\n${lines}`);
}

export async function cmdNewAd(ctx: Ctx, args: string[]) {
  const supabase = makeSupabase();
  if (!supabase) return ctx.reply('Supabase not configured.');
  const [type, token, price, amount, payment = 'UPI'] = args;
  if (!type || !token || !price || !amount) {
    return ctx.reply('Usage: /newad <buy|sell> <BTC|ETH|USDT|USDC> <price_usd> <amount> [payment_method]');
  }
  const price_usd = Number(price);
  const amountNum = Number(amount);
  if (!['buy', 'sell'].includes(type) || !['BTC', 'ETH', 'USDT', 'USDC'].includes(token) || !price_usd || !amountNum) {
    return ctx.reply('Invalid inputs.');
  }
  const { data, error } = await supabase
    .from('ads')
    .insert({
      type, token,
      price_usd,
      price_inr: Math.round(price_usd * 83),
      amount: amountNum,
      payment_method: payment,
      posted_by: String(ctx.from.id),
    })
    .select('id')
    .single();
  if (error) return ctx.reply('Failed to create ad.');
  return ctx.reply(`Ad created: ${data.id}\nOpen: https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'Cryptomallu_bot'}?start=${data.id}`);
}

