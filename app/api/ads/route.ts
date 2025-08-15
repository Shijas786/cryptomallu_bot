import { createClient } from '@supabase/supabase-js';

type Body = {
  type: 'buy' | 'sell';
  token: 'BTC' | 'ETH' | 'USDT' | 'USDC';
  price_usd: number;
  price_inr: number;
  amount: number;
  payment_method: string;
  posted_by?: string | null;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service env missing');
  return createClient(url, serviceKey);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    // Minimal validation
    if (!body || !['buy', 'sell'].includes(body.type) || !['BTC', 'ETH', 'USDT', 'USDC'].includes(body.token)) {
      return Response.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }
    if (body.amount <= 0 || body.price_usd <= 0 || body.price_inr <= 0) {
      return Response.json({ ok: false, error: 'Invalid numbers' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('ads')
      .insert({
        type: body.type,
        token: body.token,
        price_usd: body.price_usd,
        price_inr: body.price_inr,
        amount: body.amount,
        payment_method: body.payment_method,
        posted_by: body.posted_by ?? null,
      })
      .select('id')
      .single();

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true, id: data?.id });
  } catch (e) {
    return Response.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}

