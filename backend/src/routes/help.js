import { Router } from 'express';
import { askHelpBotAi, isHelpBotAiConfigured } from '../services/helpBotAi.js';
import { answerFromSystemKnowledge } from '../services/helpBotLocal.js';
import { config } from '../config/index.js';

const router = Router();

const buckets = new Map();
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 60_000;

function clientKey(req) {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function rateLimit(req, res, next) {
  const key = clientKey(req);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many help requests. Please wait a moment.' });
  }
  next();
}

/**
 * helpBotMode:
 * - knowledge (default): answer only from StackPay system data
 * - ai: prefer external AI when configured, else knowledge
 * - hybrid: knowledge first; use AI only if match is weak and AI is configured
 */
function resolveMode() {
  const mode = String(config.helpBotMode || 'knowledge').toLowerCase();
  if (mode === 'ai' || mode === 'hybrid' || mode === 'knowledge') return mode;
  return 'knowledge';
}

router.get('/status', (_req, res) => {
  res.json({
    mode: resolveMode(),
    aiEnabled: isHelpBotAiConfigured(),
    knowledgeEnabled: true,
  });
});

router.post('/chat', rateLimit, async (req, res) => {
  try {
    const question = String(req.body?.question || '').trim();
    if (!question) return res.status(400).json({ error: 'Question is required' });
    if (question.length > 500) return res.status(400).json({ error: 'Question is too long' });

    const language = ['en', 'fr', 'sw'].includes(req.body?.language) ? req.body.language : 'en';
    const context = ['default', 'app', 'developer'].includes(req.body?.context)
      ? req.body.context
      : 'default';
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const mode = resolveMode();

    const knowledge = answerFromSystemKnowledge(question, { language, context, history });

    // Default: conversational answers from StackPay data only (no API key).
    // Optional AI only when HELP_BOT_MODE=ai|hybrid and a key is configured.
    const shouldTryAi =
      isHelpBotAiConfigured() &&
      (mode === 'ai' || (mode === 'hybrid' && (!knowledge.matched || knowledge.score < 3)));

    if (shouldTryAi) {
      try {
        const ai = await askHelpBotAi({ question, history, language, context });
        return res.json({
          mode,
          aiEnabled: true,
          source: 'ai',
          answer: ai.answer,
          link: ai.link || knowledge.link,
          topicId: knowledge.topicId,
        });
      } catch (err) {
        console.error('Help bot AI fallback to knowledge:', err.message || err);
      }
    }

    res.json({
      mode,
      aiEnabled: isHelpBotAiConfigured(),
      source: knowledge.source,
      answer: knowledge.answer,
      link: knowledge.link,
      topicId: knowledge.topicId,
      matched: knowledge.matched,
    });
  } catch (err) {
    console.error('Help bot chat error:', err.message || err);
    const language = ['en', 'fr', 'sw'].includes(req.body?.language) ? req.body.language : 'en';
    const knowledge = answerFromSystemKnowledge(String(req.body?.question || ''), {
      language,
      context: 'default',
      history: Array.isArray(req.body?.history) ? req.body.history : [],
    });
    res.json({
      mode: resolveMode(),
      aiEnabled: isHelpBotAiConfigured(),
      source: 'knowledge',
      answer: knowledge.answer,
      link: knowledge.link,
      topicId: knowledge.topicId,
    });
  }
});

export default router;
