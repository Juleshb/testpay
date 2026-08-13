import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DocsPageLayout, { DocSection } from '../layouts/DocsPageLayout';
import HelpBot from '../components/HelpBot';
import { APP_NAME } from '../lib/appMeta';
import { getPublicGuideIntro, getPublicGuideSections, getPublicGuideSidebarNav } from '../lib/publicGuidance';

export default function PublicGuidePage() {
  const { t, i18n } = useTranslation();
  const [sections, setSections] = useState(getPublicGuideSections());
  const [sidebarNav, setSidebarNav] = useState(getPublicGuideSidebarNav());
  const [intro, setIntro] = useState(getPublicGuideIntro());

  useEffect(() => {
    const refresh = () => {
      setSections(getPublicGuideSections());
      setSidebarNav(getPublicGuideSidebarNav());
      setIntro(getPublicGuideIntro());
    };
    refresh();
    i18n.on('languageChanged', refresh);
    return () => i18n.off('languageChanged', refresh);
  }, [i18n]);

  return (
    <DocsPageLayout
      title={t('guide.title')}
      sectionLabel={t('common.documentation')}
      sidebarNav={sidebarNav}
      subtitle={t('guide.subtitle', { name: APP_NAME })}
    >
      <div
        className="mb-8 rounded-xl border px-4 py-3 flex flex-wrap items-center gap-2"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-success) 35%, transparent)',
          background: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
        }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-success) 40%, transparent)',
            color: 'var(--color-success)',
          }}
        >
          {t('common.publicFreeRead')}
        </span>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('guide.publicNote')}{' '}
          <Link to="/docs" className="text-[var(--color-accent)] hover:underline">
            {t('common.apiDocs')}
          </Link>
          .
        </p>
      </div>

      <section id="introduction" className="scroll-mt-28 mb-8">
        <h2 className="font-mono text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          {t('guide.introduction')}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {intro}
        </p>
        <p className="text-sm leading-relaxed mt-4" style={{ color: 'var(--color-text-secondary)' }}>
          {t('guide.introHelp')}
        </p>
      </section>

      {sections.map((group) => (
        <DocSection key={group.id} id={group.id} title={group.title}>
          <div className="space-y-6">
            {group.articles.map((article) => (
              <article
                key={article.id}
                id={article.id}
                className="scroll-mt-28 rounded-xl border p-5 sm:p-6"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-800)' }}
              >
                <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {article.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {article.body}
                </p>
              </article>
            ))}
          </div>
        </DocSection>
      ))}

      <section
        id="get-started"
        className="scroll-mt-28 mt-8 rounded-xl border p-5 sm:p-6 text-center"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="section-label mb-2">{t('guide.readyToJoin')}</p>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {t('guide.joinBody', { name: APP_NAME })}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/register"
            className="font-mono text-xs px-4 py-2 rounded-full border font-semibold"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-accent) 40%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            {t('common.createFreeAccount')}
          </Link>
          <Link to="/" className="font-mono text-xs hover:underline" style={{ color: 'var(--color-text-muted)' }}>
            {t('common.backToHome')}
          </Link>
        </div>
      </section>

      <HelpBot />
    </DocsPageLayout>
  );
}
