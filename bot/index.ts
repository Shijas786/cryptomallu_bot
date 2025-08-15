import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import { cmdPrices, cmdMyAds, cmdNewAd } from './commands';
import OpenAI from 'openai';
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

bot.command('ai', async (ctx) => {
  if (!openai) return ctx.reply('AI not configured.');
  const prompt = (ctx.message as any)?.text?.split(' ').slice(1).join(' ');
  if (!prompt) return ctx.reply('Usage: /ai <question>');
  try {
    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a crypto assistant for a P2P marketplace on Base chain.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });
    const answer = chat.choices[0]?.message?.content || 'No answer';
    await ctx.reply(answer);
  } catch (e) {
    await ctx.reply('AI error.');
  }
});

bot.launch().then(() => {
  // eslint-disable-next-line no-console
  console.log('Cryptomallu bot running');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

