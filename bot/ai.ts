import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_API_URL = process.env.AI_API_URL; // e.g. https://api.your-ai.com/chat
const AI_API_KEY = process.env.AI_API_KEY;

const SYSTEM_PROMPT = 'You are a helpful crypto assistant for a P2P marketplace on Base chain. Be concise and factual.';

export async function askAI(prompt: string): Promise<string> {
  const temperature = Number(process.env.AI_TEMPERATURE || 0.3);
  const maxTokens = Number(process.env.AI_MAX_TOKENS || 400);

  // Prefer custom AI endpoint if provided
  if (AI_API_URL) {
    try {
      const res = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(AI_API_KEY ? { authorization: `Bearer ${AI_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (!res.ok) throw new Error(`AI API ${res.status}`);
      const js = await res.json();
      // Support OpenAI-like or simple {content}
      const content = js?.choices?.[0]?.message?.content || js?.content || js?.answer;
      return content || 'No answer';
    } catch (e) {
      // Fall through to OpenAI if configured
      if (!OPENAI_API_KEY) return 'AI error.';
    }
  }

  if (!OPENAI_API_KEY) return 'AI not configured.';
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const chat = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature,
    max_tokens: maxTokens,
  });
  return chat.choices[0]?.message?.content || 'No answer';
}

// AI risk functionality removed

export type TradeIntent = {
  isIntent: boolean;
  type: 'buy' | 'sell' | null;
  amount: number | null;
  token: string | null; // symbol like BTC, ETH, USDT, USDC
  price_usd: number | null;
  payment_method: string | null;
  confidence: number;
};

const SUPPORTED_TOKENS = new Set(['BTC','ETH','USDT','USDC']);

export async function classifyTradeIntent(text: string): Promise<TradeIntent> {
  const lower = text.toLowerCase();
  // Fast heuristic to avoid calling AI for most messages
  const hasMoney = /(\$|₹|usd|inr|rs|rupee|dollar)/i.test(text);
  const hasVerb = /(buy|sell|for sale|need|want|kharid|bech|kodukk|venam|venda|kollam|kinam|uzhiy)/i.test(lower);
  if (!hasMoney && !hasVerb) {
    return { isIntent: false, type: null, amount: null, token: null, price_usd: null, payment_method: null, confidence: 0 };
  }

  // If custom AI API exists, try it first as a classifier
  if (AI_API_URL) {
    try {
      const res = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(AI_API_KEY ? { authorization: `Bearer ${AI_API_KEY}` } : {}) },
        body: JSON.stringify({
          task: 'classify_trade_intent',
          text,
        }),
      });
      if (res.ok) {
        const js = await res.json();
        if (js && typeof js.isIntent === 'boolean') return js as TradeIntent;
      }
    } catch {}
  }

  if (!OPENAI_API_KEY) {
    // Regex-only fallback
    const amountMatch = lower.match(/(\d+(?:\.\d+)?)\s*(btc|eth|usdt|usdc)/);
    const priceMatch = lower.match(/(\$|usd)\s*(\d+(?:\.\d+)?)/);
    const type: 'buy' | 'sell' | null = /(sell|for sale)/.test(lower) ? 'sell' : /(buy|need|want)/.test(lower) ? 'buy' : null;
    const token = amountMatch?.[2]?.toUpperCase() || null;
    const amount = amountMatch ? Number(amountMatch[1]) : null;
    const price_usd = priceMatch ? Number(priceMatch[2]) : null;
    const ok = !!type && !!token && !!amount && SUPPORTED_TOKENS.has(token as any);
    return { isIntent: ok, type: type, amount: amount, token, price_usd, payment_method: null, confidence: ok ? 0.6 : 0.3 };
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const schema = {
    type: 'object',
    properties: {
      isIntent: { type: 'boolean' },
      type: { type: ['string','null'], enum: ['buy','sell',null] },
      amount: { type: ['number','null'] },
      token: { type: ['string','null'] },
      price_usd: { type: ['number','null'] },
      payment_method: { type: ['string','null'] },
      confidence: { type: 'number' },
    },
    required: ['isIntent','type','amount','token','price_usd','payment_method','confidence'],
    additionalProperties: false,
  } as const;
  const prompt = `Classify if the following chat is a P2P crypto trade intent. Support Hinglish, Manglish (Malayalam in Latin), Malayalam, Hindi, and English.
Extract: isIntent, type (buy/sell), amount (number), token (symbol), price_usd (number if price given in USD or with $; else null), payment_method (UPI/IMPS/etc or null), confidence (0-1).
Only use tokens among BTC, ETH, USDT, USDC for now. If others, set token=null.`;
  const chat = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_schema', json_schema: { name: 'trade_intent', schema } as any },
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text },
    ],
  });
  const raw = chat.choices[0]?.message?.content || '{}';
  let parsed: TradeIntent;
  try { parsed = JSON.parse(raw); } catch { parsed = { isIntent: false, type: null, amount: null, token: null, price_usd: null, payment_method: null, confidence: 0 }; }
  if (parsed.token) parsed.token = parsed.token.toUpperCase();
  if (parsed.token && !SUPPORTED_TOKENS.has(parsed.token)) parsed.token = null;
  return parsed;
}

