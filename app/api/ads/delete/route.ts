import { createClient } from '@supabase/supabase-js';

type Body = { ad_id: string; telegram_id: string };

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service env missing');
  return createClient(url, serviceKey);
}

export async function POST(req: Request) {
  try {
    const { ad_id, telegram_id } = (await req.json()) as Body;
    if (!ad_id || !telegram_id) return Response.json({ ok: false, error: 'Missing fields' }, { status: 400 });

    const supabase = getServiceClient();
    const { data: ad, error: selErr } = await supabase
      .from('ads')
      .select('id, posted_by')
      .eq('id', ad_id)
      .single();
    if (selErr || !ad) return Response.json({ ok: false, error: 'Ad not found' }, { status: 404 });

    if (String(ad.posted_by || '') !== String(telegram_id)) {
      return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const { error: delErr } = await supabase.from('ads').delete().eq('id', ad_id);
    if (delErr) return Response.json({ ok: false, error: delErr.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}

