import dotenv from 'dotenv';
// Load .env.local first (Next.js style), then fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config();
import { Telegraf, Markup } from 'telegraf';
import { cmdPrices, cmdMyAds, cmdNewAd, cmdCoin, refreshCoin, cmdTop, cmdSearch, refreshCoinByQuery, refreshTopCoinsCache, searchTopCoinsList, handleSearchPagination, refreshAllCoinsCache, cmdValue, refreshValue, cmdReloadCoins, cmdPriceSimple, cmdAdPreview } from './commands';
import OpenAI from 'openai';
import { askAI, classifyTradeIntent } from './ai';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  // eslint-disable-next-line no-console
  console.error('Missing TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

const WEB_URL = process.env.WEB_URL || 'https://cryptomallu-bot.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const bot = new Telegraf(BOT_TOKEN);
const openaiKey = process.env.OPENAI_API_KEY;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

bot.catch((err, ctx) => {
  // eslint-disable-next-line no-console
  console.error('Bot error', err, 'on', ctx.updateType);
});

// Log polling errors explicitly
(bot as any).telegram?.on?.('polling_error', (err: any) => {
  // eslint-disable-next-line no-console
  console.error('Polling error', err);
});

bot.start(async (ctx) => {
  const payload = (ctx.startPayload || '').trim();

  // Upsert user if we have Supabase
  if (supabase) {
    const user = ctx.from;
    await supabase.from('users').upsert({
      telegram_id: String(user.id),
      username: user.username ?? null,
    }, { onConflict: 'telegram_id' });
  }

  const text = payload
    ? `Welcome! Opening trade ${payload}.`
    : 'Welcome to Cryptomallu. Browse P2P ads or open our WebApp.';

  await ctx.reply(text, Markup.inlineKeyboard([
    [
      Markup.button.webApp('Open Cryptomallu', `${WEB_URL}/profile`),
    ],
    payload ? [Markup.button.url('Open Trade', `${WEB_URL}/p2p?trade=${encodeURIComponent(payload)}`)] : [],
  ].filter((row) => row.length > 0) as any));
});

bot.command('help', (ctx) => ctx.reply('Use /start to open the app. Send /start <adId> to open a trade.'));

bot.command('prices', (ctx) => cmdPrices(ctx as any));
bot.command('myads', (ctx) => cmdMyAds(ctx as any));
bot.command('newad', (ctx) => {
  const text = (ctx.message as any)?.text || '';
  const args = text.split(/\s+/).slice(1);
  return cmdNewAd(ctx as any, args);
});

bot.command('ad', (ctx) => {
  const adId = ((ctx.message as any)?.text || '').split(/\s+/)[1];
  if (!adId) return (ctx as any).reply('Usage: /ad <id>');
  return cmdAdPreview(ctx as any, adId);
});

// Admin: reload caches (restrict by Telegram id if needed)
bot.command('reloadcoins', (ctx) => cmdReloadCoins(ctx as any));

bot.command('ai', async (ctx) => {
  const prompt = (ctx.message as any)?.text?.split(' ').slice(1).join(' ');
  if (!prompt) return ctx.reply('Usage: /ai <question>');
  try {
    const answer = await askAI(prompt);
    await ctx.reply(answer);
  } catch (e) {
    await ctx.reply('AI error.');
  }
});

// Generic coin commands: /btc /eth /avax /doge or /coin <query>
bot.command(['coin'], (ctx) => {
  const q = (ctx.message as any)?.text?.split(' ').slice(1).join(' ');
  if (!q) return (ctx as any).reply('Usage: /coin <symbol or name>');
  return cmdCoin(ctx as any, q);
});

const aliases = ['btc','eth','usdt','usdc','avax','sol','base','matic','xrp','ada','arb','move','doge','bnb','dot','shib'];
for (const a of aliases) {
  bot.command(a as any, (ctx) => cmdCoin(ctx as any, a));
}

// Inline refresh/delete buttons
bot.on('callback_query', async (ctx: any) => {
  const data = ctx.callbackQuery?.data as string | undefined;
  if (!data) return ctx.answerCbQuery?.();
  if (data === 'delete') {
    try { await ctx.deleteMessage?.(); } catch {}
    return ctx.answerCbQuery?.('Deleted');
  }
  if (data.startsWith('refresh:')) {
    const id = data.split(':')[1];
    return refreshCoin(ctx as any, id);
  }
  if (data.startsWith('refreshq:')) {
    const q = data.split(':').slice(1).join(':');
    return refreshCoinByQuery(ctx as any, q);
  }
  if (data.startsWith('show:')) {
    const id = data.split(':')[1];
    return cmdCoin(ctx as any, id);
  }
  if (data.startsWith('top:')) {
    const [, page, size] = data.split(':');
    const pg = Number(page) || 1;
    const perPage = Math.max(1, Math.min(250, Number(size) || 25));
    const list = await (await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${pg}&sparkline=false&price_change_percentage=24h`, { headers: { accept: 'application/json' } })).json();
    const text = list.map((c: any, i: number) => `${(pg-1)*perPage + i + 1}. ${c.name} (${String(c.symbol).toUpperCase()}) — $${Number(c.current_price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`).join('\n');
    await ctx.editMessageText?.(`Top by Market Cap (Page ${pg}, ${perPage}/page)\n\n${text}`, {
      reply_markup: {
        inline_keyboard: [[
          ...(pg > 1 ? [{ text: '⬅️ Prev', callback_data: `top:${pg - 1}:${perPage}` }] : []),
          { text: '➡️ Next', callback_data: `top:${pg + 1}:${perPage}` },
        ]],
      },
    });
    return ctx.answerCbQuery?.();
  }
  if (data.startsWith('ad:')) {
    const [, action, id] = data.split(':');
    if (action === 'open') {
      await ctx.answerCbQuery?.();
      const url = `${WEB_URL}/p2p?trade=${encodeURIComponent(id)}`;
      return ctx.reply(`Open: ${url}`);
    }
    if (action === 'escrow') {
      await ctx.answerCbQuery?.('Opening Escrow');
      const url = `${WEB_URL}/p2p?trade=${encodeURIComponent(id)}#escrow`;
      return ctx.reply(`Escrow: ${url}`);
    }
    return ctx.answerCbQuery?.();
  }
  if (data.startsWith('s:')) {
    const [, source, page, size, q] = data.split(':');
    const pg = Number(page) || 1;
    const perPage = Math.max(1, Math.min(50, Number(size) || 20));
    await handleSearchPagination(ctx as any, source === 'cache' ? 'cache' : 'api', pg, perPage, q || '');
    return ctx.answerCbQuery?.();
  }
  if (data.startsWith('val:')) {
    const [, id, amount] = data.split(':');
    await refreshValue(ctx as any, id, amount);
    return ctx.answerCbQuery?.();
  }
  return ctx.answerCbQuery?.();
});

bot.command('top', (ctx) => {
  const [, page, size] = ((ctx.message as any)?.text || '').trim().split(/\s+/);
  return cmdTop(ctx as any, page, size);
});

bot.command('search', (ctx) => {
  const q = ((ctx.message as any)?.text || '').split(' ').slice(1).join(' ');
  return cmdSearch(ctx as any, q);
});

bot.command('value', (ctx) => {
  const text = ((ctx.message as any)?.text || '');
  const q = text.replace(/^\/value\s*/i, '');
  return cmdValue(ctx as any, q);
});

bot.command('price', (ctx) => {
  const q = ((ctx.message as any)?.text || '').split(' ').slice(1).join(' ');
  return cmdPriceSimple(ctx as any, q);
});

// Free-text amount + ticker (e.g., "2 eth") and catch-all unknown slash commands
bot.on('text', async (ctx: any) => {
  const text: string = (ctx.message?.text || '').trim();
  // Detect trade intent in groups/chats
  try {
    const intent = await classifyTradeIntent(text);
    if (intent.isIntent && intent.type && intent.token && intent.amount) {
      const action = intent.type === 'buy' ? 'Buy' : 'Sell';
      const price = intent.price_usd ? ` at $${intent.price_usd}` : '';
      const pm = intent.payment_method ? ` via ${intent.payment_method}` : '';
      await ctx.reply(`Detected intent: ${action} ${intent.amount} ${intent.token}${price}${pm}. Create ad: /newad ${intent.type} ${intent.token} ${Math.max(1, intent.price_usd || 1)} ${intent.amount}`);
      return;
    }
  } catch {}
  // Detect patterns like "2 eth" or "0.5 btc"
  const m = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z0-9\-]{2,})$/);
  if (m) {
    const payload = `${m[1]} ${m[2]}`;
    return cmdValue(ctx as any, payload);
  }
  // Treat unknown /<ticker> as /coin <ticker>
  if (!text.startsWith('/')) return;
  const cmd = text.slice(1).split(/\s+/)[0].toLowerCase();
  const reserved = new Set(['start','help','prices','myads','newad','ai','coin','top','search','value']);
  if (reserved.has(cmd)) return;
  if (!/^[a-z0-9]{1,15}$/.test(cmd)) return;
  return cmdCoin(ctx as any, cmd);
});

// Inline query results (type @botname <query>)
bot.on('inline_query', async (ctx: any) => {
  const q = (ctx.inlineQuery?.query || '').trim();
  if (!q) return ctx.answerInlineQuery?.([], { cache_time: 5 });
  const matches = searchTopCoinsList(q, 20);
  const results = matches.map((c, idx) => ({
    type: 'article',
    id: `${idx}-${c.id}`,
    title: `${c.name} (${c.symbol.toUpperCase()})`,
    input_message_content: {
      message_text: `/coin ${c.id}`,
    },
    description: 'Send /coin command',
  }));
  return ctx.answerInlineQuery?.(results, { cache_time: 5 });
});

// Warm top coins cache on startup and keep it fresh
refreshTopCoinsCache(1000).catch(() => {});
setInterval(() => { refreshTopCoinsCache(1000).catch(() => {}); }, 10 * 60_000);
refreshAllCoinsCache().catch(() => {});
setInterval(() => { refreshAllCoinsCache().catch(() => {}); }, 60 * 60_000);

bot.telegram.getMe()
  .then((me) => {
    // eslint-disable-next-line no-console
    console.log(`Starting bot as @${me.username} (id ${me.id})`);
    return bot.launch();
  })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Cryptomallu bot running');
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Failed to launch bot:', e);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

