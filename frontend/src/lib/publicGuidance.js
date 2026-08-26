import i18n from '../i18n/index.js';
import { APP_NAME } from './appMeta.js';
import { buildPublicGuideSidebarNav } from './docsNav.js';

export const HELP_BOT_ENTRY_IDS = [
  'overview', 'signup', 'login', 'payments', 'networks', 'packages', 'mining',
  'withdraw', 'transfer', 'referrals', 'loans', 'community', 'settings',
  'mobile', 'balance', 'fees', 'security', 'guide', 'support', 'api', 'terms',
];

const PUBLIC_GUIDE_SECTION_DEFS = [
  { id: 'getting-started', entryIds: ['overview', 'signup', 'login', 'mobile', 'settings'] },
  { id: 'money', entryIds: ['payments', 'networks', 'balance', 'fees'] },
  { id: 'grow', entryIds: ['packages', 'mining', 'referrals', 'loans'] },
  { id: 'move-money', entryIds: ['transfer', 'withdraw'] },
  { id: 'community', entryIds: ['community', 'support'] },
  { id: 'trust', entryIds: ['security', 'terms'] },
  { id: 'developers', entryIds: ['api'] },
];

function articleFromEntry(entryId) {
  const t = i18n.t.bind(i18n);
  const base = `help.entries.${entryId}`;
  const title = t(`${base}.question`, { defaultValue: '' }).replace(/\?$/, '');
  const body = t(`${base}.answer`, { defaultValue: '' });
  if (!title || !body) return null;
  return { id: entryId, title, body };
}

export function getPublicGuideIntro() {
  return i18n.t('guide.intro', { name: APP_NAME });
}

export function getPublicGuideSections() {
  const t = i18n.t.bind(i18n);
  return PUBLIC_GUIDE_SECTION_DEFS.map(({ id, entryIds }) => {
    const articles = entryIds.map(articleFromEntry).filter(Boolean);
    if (!articles.length) return null;
    return {
      id,
      title: t(`guide.sections.${id}`),
      articles,
    };
  }).filter(Boolean);
}

export function getPublicGuideSidebarNav() {
  return buildPublicGuideSidebarNav(getPublicGuideSections());
}

export const PUBLIC_GUIDE_QUICK_LINKS = [
  'help.quickQuestions.account',
  'help.quickQuestions.networks',
  'help.quickQuestions.packages',
  'help.quickQuestions.withdraw',
  'help.devQuickQuestions.unlock',
];
