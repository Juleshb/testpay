import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import LegalPageLayout, { LegalSection } from '../layouts/LegalPageLayout';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  const s1Paragraphs = useMemo(
    () => t('legal.privacy.s1.paragraphs', { returnObjects: true }),
    [t]
  );
  const s2List = useMemo(
    () => t('legal.privacy.s2.list', { returnObjects: true }),
    [t]
  );

  return (
    <LegalPageLayout title={t('legal.privacy.title')} lastUpdated={t('legal.privacy.lastUpdated')}>
      <p>{t('legal.privacy.intro')}</p>

      <LegalSection title={t('legal.privacy.s1.title')}>
        {s1Paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </LegalSection>

      <LegalSection title={t('legal.privacy.s2.title')}>
        <p>{t('legal.privacy.s2.intro')}</p>
        <ul className="list-disc pl-5 space-y-1">
          {s2List.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t('legal.privacy.s3.title')}>
        <p>{t('legal.privacy.s3.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.s4.title')}>
        <p>{t('legal.privacy.s4.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.s5.title')}>
        <p>{t('legal.privacy.s5.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.s6.title')}>
        <p>{t('legal.privacy.s6.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.s7.title')}>
        <p>{t('legal.privacy.s7.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.s8.title')}>
        <p>{t('legal.privacy.s8.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.s9.title')}>
        <p>{t('legal.privacy.s9.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.s10.title')}>
        <p>{t('legal.privacy.s10.body')}</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
