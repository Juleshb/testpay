import { config } from '../config/index.js';
import { STACKPAY_PRODUCT_MANUAL, guessHelpLink } from './helpBotKnowledge.js';

const MAX_HISTORY = 8;
const MAX_MESSAGE = 500;

function languageInstruction(lang) {
  if (lang === 'fr') return 'Respond in French.';
  if (lang === 'sw') return 'Respond in Swahili (Kiswahili).';
  return 'Respond in English.';
}

function buildMessages({ question, history = [], language = 'en', context = 'default' }) {
  const contextNote =
    context === 'developer'
      ? 'The user is on the developer docs page; prioritize API unlock/pricing/auth when relevant.'
      : context === 'app'
        ? 'The user is signed into the StackPay app; prefer in-app navigation tips.'
        : 'The user may be on the public site; they can register or open /guide.';

  const system = [
    STACKPAY_PRODUCT_MANUAL,
    contextNote,
    languageInstruction(language),
    'Return ONLY valid JSON with this shape: {"answer":"string","link":"/path or null"}',
    'link must be one of: /dashboard, /payments/new, /payments, /networks, /packages, /packages/portfolio, /mining, /mining/portfolio, /transfer, /withdraw, /withdraw/history, /referrals, /loan, /community, /settings, /guide, /docs, /login, /register — or null.',
  ].join('\n\n');

  const msgs = [{ role: 'system', content: system }];

  const trimmedHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
  for (const turn of trimmedHistory) {
    const role = turn?.role === 'assistant' || turn?.role === 'bot' ? 'assistant' : 'user';
    const content = String(turn?.content || '').trim().slice(0, MAX_MESSAGE);
    if (content) msgs.push({ role, content });
  }

  msgs.push({ role: 'user', content: String(question).trim().slice(0, MAX_MESSAGE) });
  return msgs;
}

function parseAiJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export function isHelpBotAiConfigured() {
  return Boolean(config.helpBotAiApiKey && config.helpBotAiBaseUrl && config.helpBotAiModel);
}

/**
 * Ask the configured OpenAI-compatible model to answer a StackPay help question.
 */
export async function askHelpBotAi({ question, history, language, context }) {
  if (!isHelpBotAiConfigured()) {
    const err = new Error('Help bot AI is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const messages = buildMessages({ question, history, language, context });
  const url = `${config.helpBotAiBaseUrl.replace(/\/$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.helpBotAiTimeoutMs);

  const payload = {
    model: config.helpBotAiModel,
    temperature: 0.4,
    max_tokens: 500,
    messages,
  };

  async function callAi(body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.helpBotAiApiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  let res;
  let data;
  try {
    ({ res, data } = await callAi({ ...payload, response_format: { type: 'json_object' } }));
    // Some providers reject response_format — retry plain completion.
    if (!res.ok && /response_format|json_object|unsupported/i.test(JSON.stringify(data))) {
      ({ res, data } = await callAi(payload));
    }
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `AI request failed (${res.status})`;
    const err = new Error(typeof msg === 'string' ? msg : 'AI request failed');
    err.code = 'AI_REQUEST_FAILED';
    err.status = res.status;
    throw err;
  }

  const raw = data?.choices?.[0]?.message?.content || '';
  const parsed = parseAiJson(raw);
  const answer =
    (parsed?.answer && String(parsed.answer).trim()) ||
    String(raw).trim() ||
    'I could not generate an answer. Please try again.';

  let link = parsed?.link && String(parsed.link).startsWith('/') ? String(parsed.link) : null;
  if (!link) link = guessHelpLink(`${question} ${answer}`);

  return {
    answer: answer.slice(0, 2000),
    link,
    source: 'ai',
  };
}
