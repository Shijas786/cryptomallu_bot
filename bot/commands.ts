import { createClient } from '@supabase/supabase-js';
import { ESCROW_ARBITER, ESCROW_FEE_BPS } from '../lib/escrow';

export type Ctx = {
  reply: (text: string, extra?: any) => Promise<any>;
  editMessageText?: (text: string, extra?: any) => Promise<any>;
  answerCbQuery?: (text?: string) => Promise<any>;
  deleteMessage?: () => Promise<any>;
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

export async function cmdAdPreview(ctx: Ctx, adId: string) {
  const supabase = makeSupabase();
  if (!supabase) return ctx.reply('Supabase not configured.');
  const { data, error } = await supabase
    .from('ads')
    .select('id, type, token, price_usd, amount, payment_method, posted_by, created_at')
    .eq('id', adId)
    .single();
  if (error || !data) return ctx.reply('Ad not found.');
  const sym = String(data.token).toUpperCase();
  const lines = [
    `Ad #${data.id} — ${data.type.toUpperCase()} ${sym}`,
    `Price: $${Number(data.price_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `Amount: ${data.amount}`,
    `Payment: ${data.payment_method}`,
    `Arbiter: ${ESCROW_ARBITER.slice(0,6)}...${ESCROW_ARBITER.slice(-4)} | Fee: ${(ESCROW_FEE_BPS/100).toFixed(2)}%`,
  ].join('\n');
  return ctx.reply(lines, {
    reply_markup: {
      inline_keyboard: [[
        { text: '🔐 Create Escrow', callback_data: `ad:escrow:${data.id}` },
        { text: '🌐 Open', callback_data: `ad:open:${data.id}` },
      ]],
    },
  });
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

// ---- Coin lookup & formatting ----
export type CoinLite = { id: string; symbol: string; name: string };
let topCoinsCache: CoinLite[] = [];
let lastCacheAt = 0;
let allCoinsCache: CoinLite[] = [];
let lastAllCoinsAt = 0;

// Quick local fallback for popular symbols → CoinGecko IDs
const COMMON_COIN_IDS: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  usdt: 'tether',
  usdc: 'usd-coin',
  bnb: 'binancecoin',
  sol: 'solana',
  xrp: 'ripple',
  ada: 'cardano',
  matic: 'matic-network',
  doge: 'dogecoin',
  shib: 'shiba-inu',
  dot: 'polkadot',
  avax: 'avalanche-2',
  arb: 'arbitrum',
  op: 'optimism',
};

// ---- CoinMarketCap (optional) ----
const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY || process.env.CMC_API_KEY;

async function cmcFetch(path: string, params: Record<string, any>): Promise<any | null> {
  if (!CMC_API_KEY) return null;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) usp.set(k, String(v));
  }
  const url = `https://pro-api.coinmarketcap.com${path}?${usp.toString()}`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'X-CMC_PRO_API_KEY': CMC_API_KEY,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function cmcQuoteBySymbolOrSlug(q: string): Promise<any | null> {
  if (!CMC_API_KEY) return null;
  const query = q.trim();
  if (!query) return null;
  // Try as symbol (case-insensitive)
  let js = await cmcFetch('/v1/cryptocurrency/quotes/latest', { symbol: query.toUpperCase(), convert: 'USD' });
  if (js?.data) {
    const obj = js.data as Record<string, any>;
    const first = Object.values(obj)[0] as any | undefined;
    if (first) return first;
  }
  // Fallback: try as slug
  js = await cmcFetch('/v1/cryptocurrency/quotes/latest', { slug: query.toLowerCase(), convert: 'USD' });
  if (js?.data) {
    const obj = js.data as Record<string, any>;
    const first = Object.values(obj)[0] as any | undefined;
    if (first) return first;
  }
  return null;
}

function formatCmcCoinMessage(m: any): string {
  const name = `${m.name} (${String(m.symbol || '').toUpperCase()})`;
  const q = m.quote?.USD || {};
  const lines = [
    name,
    `Price: $${Number(q.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `MC: ${fmtUSD(q.market_cap)}`,
    `FDV: ${fmtUSD(m.fully_diluted_market_cap)}`,
    `ATH: n/a`,
    `1H: ${pctEmoji(q.percent_change_1h)} ${Number(q.percent_change_1h ?? 0).toFixed(2)}%`,
    `1D: ${pctEmoji(q.percent_change_24h)} ${Number(q.percent_change_24h ?? 0).toFixed(2)}%`,
    `7D: ${pctEmoji(q.percent_change_7d)} ${Number(q.percent_change_7d ?? 0).toFixed(2)}%`,
    `30D: ${pctEmoji(q.percent_change_30d)} ${Number(q.percent_change_30d ?? 0).toFixed(2)}%`,
  ];
  return lines.join('\n');
}

export async function refreshTopCoinsCache(limit = 1000) {
  const perPage = 250;
  const pages = Math.ceil(limit / perPage);
  const out: CoinLite[] = [];
  for (let p = 1; p <= pages; p++) {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${p}&sparkline=false`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) break;
    const arr = await res.json();
    if (!arr?.length) break;
    for (const c of arr) {
      out.push({ id: c.id, symbol: String(c.symbol).toLowerCase(), name: String(c.name) });
    }
    // tiny delay to be kind to API
    await new Promise(r => setTimeout(r, 150));
  }
  if (out.length) {
    topCoinsCache = out;
    lastCacheAt = Date.now();
  }
  return topCoinsCache.length;
}

export async function refreshAllCoinsCache() {
  const url = `https://api.coingecko.com/api/v3/coins/list?include_platform=false`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return 0;
  const arr = await res.json();
  allCoinsCache = (Array.isArray(arr) ? arr : []).map((c: any) => ({
    id: String(c.id),
    symbol: String(c.symbol || '').toLowerCase(),
    name: String(c.name || ''),
  }));
  lastAllCoinsAt = Date.now();
  return allCoinsCache.length;
}

export function searchCoinInCache(q: string): string | null {
  const query = q.trim().toLowerCase();
  if (!query) return null;
  // direct id match from cache
  const byId = topCoinsCache.find(c => String(c.id).toLowerCase() === query);
  if (byId) return byId.id;
  const exactSym = topCoinsCache.find(c => c.symbol === query);
  if (exactSym) return exactSym.id;
  const exactName = topCoinsCache.find(c => c.name.toLowerCase() === query);
  if (exactName) return exactName.id;
  // startsWith fallback
  const starts = topCoinsCache.find(c => c.symbol.startsWith(query) || c.name.toLowerCase().startsWith(query));
  return starts ? starts.id : null;
}

export function searchTopCoinsList(q: string, limit = 10): CoinLite[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const scored = topCoinsCache
    .map(c => {
      const name = c.name.toLowerCase();
      const sym = c.symbol.toLowerCase();
      let score = -1;
      if (sym === query) score = 100;
      else if (name === query) score = 90;
      else if (sym.startsWith(query)) score = 80;
      else if (name.startsWith(query)) score = 70;
      else if (sym.includes(query)) score = 60;
      else if (name.includes(query)) score = 50;
      return { c, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.c);
}
export function searchTopCoinsAll(q: string): CoinLite[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const scored = topCoinsCache
    .map(c => {
      const name = c.name.toLowerCase();
      const sym = c.symbol.toLowerCase();
      let score = -1;
      if (sym === query) score = 100;
      else if (name === query) score = 90;
      else if (sym.startsWith(query)) score = 80;
      else if (name.startsWith(query)) score = 70;
      else if (sym.includes(query)) score = 60;
      else if (name.includes(query)) score = 50;
      return { c, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.c);
  return scored;
}
function fmtUSD(n: number | null | undefined): string {
  if (!n && n !== 0) return 'n/a';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function pctEmoji(v?: number | null) {
  if (v == null) return '•';
  return v >= 0 ? '🟢' : '🔴';
}

export async function coingeckoSearchId(q: string): Promise<string | null> {
  // Try cache first (covers top 1000)
  if (!topCoinsCache.length || Date.now() - lastCacheAt > 10 * 60_000) {
    await refreshTopCoinsCache();
  }
  const qLower = q.trim().toLowerCase();
  if (COMMON_COIN_IDS[qLower]) return COMMON_COIN_IDS[qLower];
  const inTop = topCoinsCache.find(c => c.symbol === qLower);
  if (inTop) return inTop.id;
  if (!allCoinsCache.length || Date.now() - lastAllCoinsAt > 60 * 60_000) {
    await refreshAllCoinsCache();
  }
  const byTicker = allCoinsCache.find(c => c.symbol === qLower);
  if (byTicker) return byTicker.id;
  const byNameEq = allCoinsCache.find(c => c.name.toLowerCase() === qLower);
  if (byNameEq) return byNameEq.id;
  const byStarts = allCoinsCache.find(c => c.symbol.startsWith(qLower) || c.name.toLowerCase().startsWith(qLower));
  if (byStarts) return byStarts.id;
  const cached = searchCoinInCache(q);
  if (cached) return cached;
  // Fallback to API search
  const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, { headers: { accept: 'application/json' } });
  if (!res.ok) return null;
  const js = await res.json();
  const coins = (js?.coins || []) as any[];
  if (!coins.length) return null;
  // reuse qLower
  const bySymbol = coins.filter(c => String(c.symbol || '').toLowerCase() === qLower);
  const pick = (bySymbol[0] || coins.find(c => String(c.name || '').toLowerCase() === qLower) || coins[0]);
  return (pick?.id as string) || null;
}

export async function fetchCoinMarket(id: string) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(id)}&precision=2&price_change_percentage=1h,24h,7d,30d`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return null;
  const arr = await res.json();
  return arr?.[0] || null;
}

export async function fetchCoinInrPrice(id: string): Promise<number | null> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&ids=${encodeURIComponent(id)}&precision=2`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return null;
  const arr = await res.json();
  const first = arr?.[0];
  return typeof first?.current_price === 'number' ? first.current_price : null;
}

async function fetchCoinSimplePrices(id: string): Promise<{ usd: number | null; inr: number | null }> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd,inr`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return { usd: null, inr: null };
  const js = await res.json();
  const row = js?.[id] || {};
  const usd = typeof row.usd === 'number' ? row.usd : null;
  const inr = typeof row.inr === 'number' ? row.inr : null;
  return { usd, inr };
}

function findCoinMetaById(id: string): { name: string; symbol: string } {
  const inTop = topCoinsCache.find(c => c.id === id);
  if (inTop) return { name: inTop.name, symbol: inTop.symbol };
  const inAll = (typeof allCoinsCache !== 'undefined' ? allCoinsCache : []).find(c => c.id === id);
  if (inAll) return { name: inAll.name, symbol: inAll.symbol };
  return { name: id, symbol: id };
}

export function formatCoinMessage(m: any): string {
  const name = `${m.name} (${String(m.symbol || '').toUpperCase()})`;
  const lines = [
    name,
    `Price: $${m.current_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `MC: ${fmtUSD(m.market_cap)}`,
    `FDV: ${fmtUSD(m.fully_diluted_valuation)}`,
    `ATH: $${(m.ath ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `1H: ${pctEmoji(m.price_change_percentage_1h_in_currency)} ${Number(m.price_change_percentage_1h_in_currency ?? 0).toFixed(2)}%`,
    `1D: ${pctEmoji(m.price_change_percentage_24h_in_currency)} ${Number(m.price_change_percentage_24h_in_currency ?? 0).toFixed(2)}%`,
    `7D: ${pctEmoji(m.price_change_percentage_7d_in_currency)} ${Number(m.price_change_percentage_7d_in_currency ?? 0).toFixed(2)}%`,
    `30D: ${pctEmoji(m.price_change_percentage_30d_in_currency)} ${Number(m.price_change_percentage_30d_in_currency ?? 0).toFixed(2)}%`,
  ];
  return lines.join('\n');
}

function formatCoinMessageWithInr(m: any, inrPrice: number | null): string {
  const name = `${m.name} (${String(m.symbol || '').toUpperCase()})`;
  const priceLine = inrPrice != null
    ? `Price: $${m.current_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ₹${Number(inrPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : `Price: $${m.current_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const lines = [
    name,
    priceLine,
    `MC: ${fmtUSD(m.market_cap)}`,
    `FDV: ${fmtUSD(m.fully_diluted_valuation)}`,
    `ATH: $${(m.ath ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `1H: ${pctEmoji(m.price_change_percentage_1h_in_currency)} ${Number(m.price_change_percentage_1h_in_currency ?? 0).toFixed(2)}%`,
    `1D: ${pctEmoji(m.price_change_percentage_24h_in_currency)} ${Number(m.price_change_percentage_24h_in_currency ?? 0).toFixed(2)}%`,
    `7D: ${pctEmoji(m.price_change_percentage_7d_in_currency)} ${Number(m.price_change_percentage_7d_in_currency ?? 0).toFixed(2)}%`,
    `30D: ${pctEmoji(m.price_change_percentage_30d_in_currency)} ${Number(m.price_change_percentage_30d_in_currency ?? 0).toFixed(2)}%`,
  ];
  return lines.join('\n');
}

function formatValueMessage(m: any, inrPrice: number | null, amount: number): string {
  const name = `${m.name} (${String(m.symbol || '').toUpperCase()})`;
  const usd = Number(m.current_price ?? 0);
  const inr = inrPrice != null ? Number(inrPrice) : null;
  const usdVal = usd * amount;
  const inrVal = inr != null ? inr * amount : null;
  const priceLine = inr != null
    ? `Price: $${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ₹${inr.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : `Price: $${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const valueLine = inrVal != null
    ? `Value (${amount} ${String(m.symbol).toUpperCase()}): $${usdVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ₹${inrVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : `Value (${amount} ${String(m.symbol).toUpperCase()}): $${usdVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const lines = [
    name,
    priceLine,
    valueLine,
    `MC: ${fmtUSD(m.market_cap)}`,
    `FDV: ${fmtUSD(m.fully_diluted_valuation)}`,
    `ATH: $${(m.ath ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
  ];
  return lines.join('\n');
}

function parseAmountAndQuery(input: string): { amount: number; query: string } | null {
  const raw = input.trim().replace(/^\//, '').replace(/[^a-zA-Z0-9\-\.\s]/g, '');
  const m = raw.match(/^([0-9]*\.?[0-9]+)\s*([a-zA-Z0-9\-]{1,})$/);
  if (!m) return null;
  const amount = Number(m[1]);
  const query = m[2].toLowerCase().replace(/[^a-z0-9\-]/g, '');
  if (!amount || !isFinite(amount)) return null;
  return { amount, query };
}

export async function cmdCoin(ctx: Ctx, query: string) {
  try {
    const id = await coingeckoSearchId(query);
    if (id) {
      const [m, inr] = await Promise.all([
        fetchCoinMarket(id),
        fetchCoinInrPrice(id),
      ]);
      if (m) {
        const text = formatCoinMessageWithInr(m, inr);
        return ctx.reply(text, {
          reply_markup: {
            inline_keyboard: [[
              { text: '🔄 Refresh', callback_data: `refresh:${id}` },
              { text: '🗑️ Delete', callback_data: `delete` },
            ]],
          },
          parse_mode: 'Markdown',
        });
      }
    }
    // Fallback to CoinMarketCap (symbol or slug)
    const cmc = await cmcQuoteBySymbolOrSlug(query);
    if (cmc) {
      const text = formatCmcCoinMessage(cmc);
      return ctx.reply(text, {
        reply_markup: {
          inline_keyboard: [[
            { text: '🔄 Refresh', callback_data: `refreshq:${query}` },
            { text: '🗑️ Delete', callback_data: `delete` },
          ]],
        },
      });
    }
    return ctx.reply('Coin not found. Try: /btc, /eth, /avax');
  } catch (e) {
    return ctx.reply('Error fetching coin.');
  }
}

export async function cmdSearch(ctx: Ctx, query: string) {
  const q = query.trim();
  if (!q) return ctx.reply('Usage: /search <query>');
  if (!topCoinsCache.length || Date.now() - lastCacheAt > 10 * 60_000) {
    await refreshTopCoinsCache();
  }
  const perPage = 20;
  const cachedAll = searchTopCoinsAll(q);
  if (cachedAll.length) {
    const page = 1;
    const start = (page - 1) * perPage;
    const slice = cachedAll.slice(start, start + perPage);
    const lines = slice.map((c: any, i: number) => `${start + i + 1}. ${c.name} (${String(c.symbol).toUpperCase()})`).join('\n');
    return ctx.reply(`Matches for "${q}" (tickers prioritized) — ${slice.length}/${cachedAll.length}\n\n${lines}`, {
      reply_markup: {
        inline_keyboard: [[
          ...(page > 1 ? [{ text: '⬅️ Prev', callback_data: `s:cache:${page - 1}:${perPage}:${encodeURIComponent(q)}` }] : []),
          ...(start + slice.length < cachedAll.length ? [{ text: '➡️ Next', callback_data: `s:cache:${page + 1}:${perPage}:${encodeURIComponent(q)}` }] : []),
        ], slice.map((c: any) => ({ text: String(c.symbol).toUpperCase(), callback_data: `show:${c.id}` }))],
      },
    });
  }
  const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, { headers: { accept: 'application/json' } });
  if (!res.ok) return ctx.reply('Search failed.');
  const js = await res.json();
  const qLower = q.toLowerCase();
  const coinsAll = (js?.coins || []) as any[];
  // Prioritize ticker matches across ALL coins, then name matches
  const scored = coinsAll
    .map((c: any, i: number) => {
      const sym = String(c.symbol || '').toLowerCase();
      const name = String(c.name || '').toLowerCase();
      let score = -i; // keep API order as slight tiebreaker
      if (sym === qLower) score = 1000 - i;
      else if (name === qLower) score = 900 - i;
      else if (sym.startsWith(qLower)) score = 800 - i;
      else if (name.startsWith(qLower)) score = 700 - i;
      else if (sym.includes(qLower)) score = 600 - i;
      else if (name.includes(qLower)) score = 500 - i;
      return { c, score };
    })
    .filter(s => s.score > -999)
    .sort((a, b) => b.score - a.score)
    .map(s => s.c);
  const seen = new Set<string>();
  const deduped = scored.filter((c: any) => {
    const id = String(c.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (!deduped.length) {
    // Final fallback to CMC single-symbol/slug match if available
    const cmc = await cmcQuoteBySymbolOrSlug(q);
    if (cmc) {
      const line = `${cmc.name} (${String(cmc.symbol).toUpperCase()})`;
      return ctx.reply(`Matches for "${q}":\n\n1. ${line}`, {
        reply_markup: {
          inline_keyboard: [[{ text: String(cmc.symbol).toUpperCase(), callback_data: `refreshq:${q}` }]],
        },
      });
    }
    return ctx.reply('No matches.');
  }
  const page = 1;
  const start = (page - 1) * perPage;
  const slice = deduped.slice(start, start + perPage);
  const lines = slice.map((c: any, i: number) => `${start + i + 1}. ${c.name} (${String(c.symbol).toUpperCase()})`).join('\n');
  return ctx.reply(`Matches for "${q}" (tickers prioritized) — ${slice.length}/${deduped.length}\n\n${lines}`, {
    reply_markup: {
      inline_keyboard: [[
        ...(page > 1 ? [{ text: '⬅️ Prev', callback_data: `s:api:${page - 1}:${perPage}:${encodeURIComponent(q)}` }] : []),
        ...(start + slice.length < deduped.length ? [{ text: '➡️ Next', callback_data: `s:api:${page + 1}:${perPage}:${encodeURIComponent(q)}` }] : []),
      ], slice.map((c: any) => ({ text: c.symbol.toUpperCase(), callback_data: `show:${c.id}` }))],
    },
  });
}

export async function handleSearchPagination(ctx: Ctx, source: 'cache' | 'api', page: number, perPage: number, q: string) {
  const query = decodeURIComponent(q);
  const safePage = Math.max(1, page || 1);
  const size = Math.max(1, Math.min(50, perPage || 20));
  let items: CoinLite[] = [];
  if (source === 'cache') {
    if (!topCoinsCache.length || Date.now() - lastCacheAt > 10 * 60_000) {
      await refreshTopCoinsCache();
    }
    items = searchTopCoinsAll(query);
  } else {
    const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, { headers: { accept: 'application/json' } });
    const js = await res.json();
    const qLower = query.toLowerCase();
    const coinsAll = (js?.coins || []) as any[];
    const scored = coinsAll
      .map((c: any, i: number) => {
        const sym = String(c.symbol || '').toLowerCase();
        const name = String(c.name || '').toLowerCase();
        let score = -i;
        if (sym === qLower) score = 1000 - i;
        else if (name === qLower) score = 900 - i;
        else if (sym.startsWith(qLower)) score = 800 - i;
        else if (name.startsWith(qLower)) score = 700 - i;
        else if (sym.includes(qLower)) score = 600 - i;
        else if (name.includes(qLower)) score = 500 - i;
        return { c, score };
      })
      .filter(s => s.score > -999)
      .sort((a, b) => b.score - a.score)
      .map(s => ({ id: s.c.id, name: s.c.name, symbol: s.c.symbol }));
    const seen = new Set<string>();
    items = scored.filter(c => {
      const id = String(c.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  const start = (safePage - 1) * size;
  const slice = items.slice(start, start + size);
  const lines = slice.map((c: any, i: number) => `${start + i + 1}. ${c.name} (${String(c.symbol).toUpperCase()})`).join('\n');
  await (ctx.editMessageText || ctx.reply)(`Matches for "${query}" (tickers prioritized) — ${slice.length}/${items.length}\n\n${lines}`, {
    reply_markup: {
      inline_keyboard: [[
        ...(safePage > 1 ? [{ text: '⬅️ Prev', callback_data: `s:${source}:${safePage - 1}:${size}:${encodeURIComponent(query)}` }] : []),
        ...(start + slice.length < items.length ? [{ text: '➡️ Next', callback_data: `s:${source}:${safePage + 1}:${size}:${encodeURIComponent(query)}` }] : []),
      ], slice.map((c: any) => ({ text: String(c.symbol).toUpperCase(), callback_data: `show:${c.id}` }))],
    },
  });
}

export async function cmdValue(ctx: Ctx, input: string) {
  const parsed = parseAmountAndQuery(input);
  if (!parsed) return ctx.reply('Usage: /value <amount> <symbol>. Example: /value 2 eth');
  const { amount, query } = parsed;
  try {
    const id = await coingeckoSearchId(query);
    if (!id) return ctx.reply('Coin not found.');
    const [m, inr] = await Promise.all([
      fetchCoinMarket(id),
      fetchCoinInrPrice(id),
    ]);
    let text: string;
    if (!m) {
      // Fallback: simple price, build minimal market object
      const simple = await fetchCoinSimplePrices(id);
      if (simple.usd == null && simple.inr == null) return ctx.reply('Failed to load coin data.');
      const meta = findCoinMetaById(id);
      const minimal = {
        name: meta.name,
        symbol: meta.symbol,
        current_price: simple.usd ?? 0,
        market_cap: null,
        fully_diluted_valuation: null,
        ath: null,
        price_change_percentage_1h_in_currency: null,
        price_change_percentage_24h_in_currency: null,
        price_change_percentage_7d_in_currency: null,
        price_change_percentage_30d_in_currency: null,
      } as any;
      text = formatValueMessage(minimal, simple.inr ?? inr ?? null, amount);
    } else {
      text = formatValueMessage(m, inr, amount);
    }
    return ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Refresh', callback_data: `val:${id}:${amount}` },
          { text: '🗑️ Delete', callback_data: `delete` },
        ]],
      },
    });
  } catch (e) {
    return ctx.reply('Error calculating value.');
  }
}

export async function refreshValue(ctx: Ctx, id: string, amountStr: string) {
  const amount = Number(amountStr);
  if (!amount || !isFinite(amount)) return ctx.answerCbQuery?.('Invalid amount');
  try {
    const [m, inr] = await Promise.all([
      fetchCoinMarket(id),
      fetchCoinInrPrice(id),
    ]);
    let text: string;
    if (!m) {
      const simple = await fetchCoinSimplePrices(id);
      if (simple.usd == null && simple.inr == null) return ctx.answerCbQuery?.('Failed');
      const meta = findCoinMetaById(id);
      const minimal = {
        name: meta.name,
        symbol: meta.symbol,
        current_price: simple.usd ?? 0,
        market_cap: null,
        fully_diluted_valuation: null,
        ath: null,
        price_change_percentage_1h_in_currency: null,
        price_change_percentage_24h_in_currency: null,
        price_change_percentage_7d_in_currency: null,
        price_change_percentage_30d_in_currency: null,
      } as any;
      text = formatValueMessage(minimal, simple.inr ?? inr ?? null, amount);
    } else {
      text = formatValueMessage(m, inr, amount);
    }
    await ctx.editMessageText?.(text, {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Refresh', callback_data: `val:${id}:${amount}` },
          { text: '🗑️ Delete', callback_data: `delete` },
        ]],
      },
    });
    return ctx.answerCbQuery?.('Updated');
  } catch (e) {
    return ctx.answerCbQuery?.('Failed');
  }
}

export async function cmdReloadCoins(ctx: Ctx) {
  try {
    const [topN, allN] = await Promise.all([
      refreshTopCoinsCache(1000),
      refreshAllCoinsCache(),
    ]);
    return ctx.reply(`Reloaded coins: top=${topN}, all=${allN}`);
  } catch {
    return ctx.reply('Failed to reload coins');
  }
}

export async function cmdPriceSimple(ctx: Ctx, arg: string) {
  const q = (arg || '').trim();
  if (!q) return ctx.reply('Usage: /price <symbol>. Example: /price btc');
  try {
    const lower = q.toLowerCase();
    let id = COMMON_COIN_IDS[lower] || null;
    if (!id) {
      id = searchCoinInCache(lower);
    }
    if (!id) {
      id = await coingeckoSearchId(lower);
    }
    if (!id) return ctx.reply(`Unknown coin: ${q}`);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd,inr`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return ctx.reply('Price fetch failed');
    const js = await res.json();
    const row = js?.[id];
    if (!row) return ctx.reply(`Unknown coin: ${q}`);
    const usd = Number(row.usd ?? 0);
    const inr = Number(row.inr ?? 0);
    const text = `${q.toUpperCase()} Price: $${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` + (inr ? ` / ₹${inr.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '');
    return ctx.reply(text);
  } catch (e) {
    return ctx.reply('Error fetching price');
  }
}

export async function refreshCoin(ctx: Ctx, id: string) {
  try {
    const [m, inr] = await Promise.all([
      fetchCoinMarket(id),
      fetchCoinInrPrice(id),
    ]);
    if (!m) return ctx.answerCbQuery?.('Failed');
    const text = formatCoinMessageWithInr(m, inr);
    await ctx.editMessageText?.(text, {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Refresh', callback_data: `refresh:${id}` },
          { text: '🗑️ Delete', callback_data: `delete` },
        ]],
      },
    });
    return ctx.answerCbQuery?.('Updated');
  } catch (e: any) {
    // Ignore 400 not modified; surface as up-to-date
    return ctx.answerCbQuery?.('Up to date');
  }
}

export async function refreshCoinByQuery(ctx: Ctx, q: string) {
  try {
    const cmc = await cmcQuoteBySymbolOrSlug(q);
    if (!cmc) return ctx.answerCbQuery?.('Failed');
    const text = formatCmcCoinMessage(cmc);
    await ctx.editMessageText?.(text, {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Refresh', callback_data: `refreshq:${q}` },
          { text: '🗑️ Delete', callback_data: `delete` },
        ]],
      },
    });
    return ctx.answerCbQuery?.('Updated');
  } catch (e: any) {
    return ctx.answerCbQuery?.('Failed');
  }
}

// ---- Top coins (paginated) ----
export async function getTopCoins(page = 1, perPage = 25) {
  const clamped = Math.max(1, Math.min(250, perPage));
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${clamped}&page=${page}&sparkline=false&price_change_percentage=24h`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return [];
  return await res.json();
}

export function formatTopList(list: any[], page: number, perPage: number) {
  const startRank = (page - 1) * perPage + 1;
  const lines = list.map((c: any, i: number) => {
    const rank = startRank + i;
    const price = `$${Number(c.current_price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const sym = String(c.symbol || '').toUpperCase();
    return `${rank}. ${c.name} (${sym}) — ${price}`;
  });
  return `Top by Market Cap (Page ${page}, ${perPage}/page)\n\n${lines.join('\n')}\n\nTip: use /coin <name or symbol> or /${(list[0]?.symbol || 'btc').toLowerCase()}`;
}

export async function cmdTop(ctx: Ctx, pageArg?: string, sizeArg?: string) {
  const pageNum = Math.max(1, Number(pageArg || 1) || 1);
  const perPage = Math.max(1, Math.min(250, Number(sizeArg || 25) || 25));
  const list = await getTopCoins(pageNum, perPage);
  if (!list.length) return ctx.reply('Failed to load top coins.');
  const text = formatTopList(list, pageNum, perPage);
  return ctx.reply(text, {
    reply_markup: {
      inline_keyboard: [[
        ...(pageNum > 1 ? [{ text: '⬅️ Prev', callback_data: `top:${pageNum - 1}:${perPage}` }] : []),
        { text: '➡️ Next', callback_data: `top:${pageNum + 1}:${perPage}` },
      ]],
    },
  });
}

