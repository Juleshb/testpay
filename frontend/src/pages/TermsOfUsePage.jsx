import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import LegalPageLayout, { LegalSection } from '../layouts/LegalPageLayout';

export default function TermsOfUsePage() {
  const { t } = useTranslation();

  const s3Paragraphs = useMemo(
    () => t('legal.terms.s3.paragraphs', { returnObjects: true }),
    [t]
  );
  const s4Paragraphs = useMemo(
    () => t('legal.terms.s4.paragraphs', { returnObjects: true }),
    [t]
  );
  const s10Paragraphs = useMemo(
    () => t('legal.terms.s10.paragraphs', { returnObjects: true }),
    [t]
  );

  return (
    <LegalPageLayout title={t('legal.terms.title')} lastUpdated={t('legal.terms.lastUpdated')}>
      <p>{t('legal.terms.intro')}</p>

      <LegalSection title={t('legal.terms.s1.title')}>
        <p>{t('legal.terms.s1.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.s2.title')}>
        <p>{t('legal.terms.s2.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.s3.title')}>
        {s3Paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </LegalSection>

      <LegalSection title={t('legal.terms.s4.title')}>
        {s4Paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </LegalSection>

      <LegalSection title={t('legal.terms.s5.title')}>
        <p>{t('legal.terms.s5.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.s6.title')}>
        <p>{t('legal.terms.s6.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.s7.title')}>
        <p>{t('legal.terms.s7.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.s8.title')}>
        <p>{t('legal.terms.s8.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.s9.title')}>
        <p>{t('legal.terms.s9.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.s10.title')}>
        {s10Paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </LegalSection>
    </LegalPageLayout>
  );
}
