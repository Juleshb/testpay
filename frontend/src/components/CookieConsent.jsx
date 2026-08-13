import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import { COOKIE_CONSENT, getCookieConsent, setCookieConsent } from '../lib/cookies';

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    setCookieConsent(COOKIE_CONSENT.ACCEPTED);
    setVisible(false);
  };

  const decline = () => {
    setCookieConsent(COOKIE_CONSENT.DECLINED);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title" aria-live="polite">
      <div className="cookie-consent-inner">
        <div className="min-w-0 flex-1">
          <p id="cookie-consent-title" className="font-semibold text-sm">
            {t('cookie.title')}
          </p>
          <p className="font-mono text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {t('cookie.body')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <Button type="button" size="sm" onClick={accept} className="whitespace-nowrap">
            {t('cookie.accept')}
          </Button>
          <button
            type="button"
            onClick={decline}
            className="font-mono text-xs px-3 py-2 rounded-lg border whitespace-nowrap"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            {t('cookie.essentialOnly')}
          </button>
        </div>
      </div>
    </div>
  );
}
