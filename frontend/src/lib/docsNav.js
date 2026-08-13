import i18n from '../i18n/index.js';

export const DOCS_SITE_NAV = [
  { to: '/guide', labelKey: 'common.userGuide', descriptionKey: 'common.publicFreeRead' },
  { to: '/docs', labelKey: 'common.apiReference', descriptionKey: 'common.developers' },
];

export function getDocsSiteNavItems() {
  const t = i18n.t.bind(i18n);
  return DOCS_SITE_NAV.map((item) => ({
    to: item.to,
    label: t(item.labelKey),
    description: t(item.descriptionKey),
  }));
}

/** Flat page nav item */
export function flatDocNav(items) {
  return items.map(({ id, label }) => ({ id, label }));
}

/** Build nested sidebar nav from public guide sections */
export function buildPublicGuideSidebarNav(sections, { includeIntroduction = true } = {}) {
  const t = i18n.t.bind(i18n);
  const nav = [];

  if (includeIntroduction) {
    nav.push({ id: 'introduction', label: t('guide.introduction') });
  }

  for (const section of sections) {
    nav.push({
      id: section.id,
      label: t(`guide.sections.${section.id}`, { defaultValue: section.title }),
      children: section.articles.map((article) => ({
        id: article.id,
        label: article.title,
      })),
    });
  }

  nav.push({ id: 'get-started', label: t('guide.getStarted') });
  return nav;
}
