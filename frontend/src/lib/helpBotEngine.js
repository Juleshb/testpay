import i18n from '../i18n/index.js';
import {
  buildHelpBotKnowledge,
  getHelpBotGreeting,
  getHelpBotFallback,
  getHelpBotQuickQuestions,
  HELP_BOT_ENTRY_IDS,
  DEVELOPER_HELP_ENTRY_IDS,
} from './helpBotI18n.js';

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreEntry(query, entry) {
  let score = 0;
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return 0;

  const normalizedQuestion = normalize(entry.question);
  if (normalizedQuery.includes(normalizedQuestion) || normalizedQuestion.includes(normalizedQuery)) {
    score += 12;
  }

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalize(keyword);
    if (!normalizedKeyword) continue;
    if (normalizedQuery.includes(normalizedKeyword)) {
      score += normalizedKeyword.includes(' ') ? 4 : 2;
    }
  }

  const queryWords = normalizedQuery.split(' ').filter((word) => word.length > 2);
  for (const word of queryWords) {
    if (normalize(entry.answer).includes(word)) score += 0.5;
    if (normalize(entry.question).includes(word)) score += 1;
  }

  return score;
}

function knowledgeForContext(context) {
  if (context === 'developer') {
    return [...buildHelpBotKnowledge(DEVELOPER_HELP_ENTRY_IDS), ...buildHelpBotKnowledge(HELP_BOT_ENTRY_IDS)];
  }
  return buildHelpBotKnowledge(HELP_BOT_ENTRY_IDS);
}

export { getHelpBotGreeting };

export function findHelpBotAnswer(question, context = 'default') {
  const trimmed = String(question || '').trim();
  if (!trimmed) return null;

  const pool = knowledgeForContext(context);
  let best = null;
  let bestScore = 0;

  for (const entry of pool) {
    const score = scoreEntry(trimmed, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore < 2) {
    return {
      answer: getHelpBotFallback(),
      matched: false,
    };
  }

  return {
    answer: best.answer,
    matched: true,
    question: best.question,
  };
}

export function getHelpBotSuggestions(query = '', context = 'default') {
  const normalized = normalize(query);
  if (!normalized) {
    return getHelpBotQuickQuestions(context);
  }

  return knowledgeForContext(context)
    .map((entry) => ({ question: entry.question, score: scoreEntry(query, entry) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.question);
}

/** Rebuild knowledge when language changes (for components that cache messages). */
export function onHelpBotLanguageChange(callback) {
  i18n.on('languageChanged', callback);
  return () => i18n.off('languageChanged', callback);
}
