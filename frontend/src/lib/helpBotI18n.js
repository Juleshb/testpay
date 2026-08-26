import i18n from '../i18n/index.js';

export const HELP_BOT_ENTRY_IDS = [
  'overview',
  'signup',
  'login',
  'payments',
  'networks',
  'packages',
  'mining',
  'withdraw',
  'transfer',
  'referrals',
  'loans',
  'community',
  'settings',
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

/** In-app deep links for matched help topics */
export const HELP_BOT_LINKS = {
  overview: '/dashboard',
  signup: '/register',
  login: '/login',
  payments: '/payments/new',
  networks: '/networks',
  packages: '/packages',
  mining: '/mining',
  withdraw: '/withdraw',
  transfer: '/transfer',
  referrals: '/referrals',
  loans: '/loan',
  community: '/community',
  settings: '/settings',
  balance: '/dashboard',
  guide: '/guide',
  api: '/docs',
  mobile: '/settings',
};

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
        link: HELP_BOT_LINKS[id] || null,
      };
    })
    .filter(Boolean);
}

export function getHelpBotQuickQuestions(context = 'default') {
  const t = i18n.t.bind(i18n);
  if (context === 'developer') {
    return Object.values(t('help.devQuickQuestions', { returnObjects: true }));
  }
  if (context === 'app') {
    return Object.values(t('help.appQuickQuestions', { returnObjects: true }));
  }
  return Object.values(t('help.quickQuestions', { returnObjects: true }));
}

export function getHelpBotGreeting(context = 'default') {
  if (context === 'developer') return i18n.t('help.devGreeting');
  if (context === 'app') return i18n.t('help.appGreeting');
  return i18n.t('help.greeting');
}

export function getHelpBotFallback(context = 'default') {
  if (context === 'app') return i18n.t('help.appFallback');
  return i18n.t('help.fallback');
}

export function getHelpBotSubtitle(context = 'default') {
  if (context === 'developer') return i18n.t('help.devSubtitle');
  if (context === 'app') return i18n.t('help.appSubtitle');
  return i18n.t('help.subtitle');
}
