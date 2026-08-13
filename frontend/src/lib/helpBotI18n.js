import i18n from '../i18n/index.js';

export const HELP_BOT_ENTRY_IDS = [
  'signup',
  'login',
  'payments',
  'networks',
  'packages',
  'withdraw',
  'transfer',
  'referrals',
  'loans',
  'community',
  'mobile',
  'balance',
  'fees',
  'security',
  'guide',
  'support',
  'api',
  'terms',
];

export const DEVELOPER_HELP_ENTRY_IDS = [
  'apiUnlock',
  'apiPricing',
  'apiPayment',
  'apiAuth',
  'api',
  'guide',
];

export function buildHelpBotKnowledge(entryIds = HELP_BOT_ENTRY_IDS) {
  const t = i18n.t.bind(i18n);
  return entryIds
    .map((id) => {
      const base = `help.entries.${id}`;
      const question = t(`${base}.question`, { defaultValue: '' });
      const answer = t(`${base}.answer`, { defaultValue: '' });
      if (!question || !answer) return null;
      const keywords = t(`${base}.keywords`, { returnObjects: true, defaultValue: [] });
      return {
        id,
        question,
        answer,
        keywords: Array.isArray(keywords) ? keywords : [],
      };
    })
    .filter(Boolean);
}

export function getHelpBotQuickQuestions(context = 'default') {
  const t = i18n.t.bind(i18n);
  if (context === 'developer') {
    return Object.values(t('help.devQuickQuestions', { returnObjects: true }));
  }
  return Object.values(t('help.quickQuestions', { returnObjects: true }));
}

export function getHelpBotGreeting(context = 'default') {
  return context === 'developer' ? i18n.t('help.devGreeting') : i18n.t('help.greeting');
}

export function getHelpBotFallback() {
  return i18n.t('help.fallback');
}
