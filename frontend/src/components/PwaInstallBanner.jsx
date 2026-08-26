import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import InstallAppGuide, { detectInstallPlatform, isStandaloneDisplay } from './InstallAppGuide';
import { COOKIE_CONSENT, hasCookieConsent } from '../lib/cookies';

const SHOW_DELAY_MS = 1800;
const DISMISS_KEY = 'pwa-install-dismissed';

export default function PwaInstallBanner() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const scheduledRef = useRef(false);
  const timerRef = useRef(0);
  const platform = detectInstallPlatform();

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
    setDeferredPrompt(null);
  };

  useEffect(() => {
    if (isStandaloneDisplay()) return undefined;
    if (localStorage.getItem(DISMISS_KEY)) return undefined;

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const scheduleShow = () => {
      if (scheduledRef.current || localStorage.getItem(DISMISS_KEY) || isStandaloneDisplay()) return;
      if (!hasCookieConsent()) return;
      scheduledRef.current = true;
      timerRef.current = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };

    scheduleShow();

    const onConsent = (event) => {
      if (event?.detail?.value === COOKIE_CONSENT.ACCEPTED) scheduleShow();
    };
    window.addEventListener('stackpay:cookie-consent', onConsent);

    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('stackpay:cookie-consent', onConsent);
    };
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') dismiss();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  const hint =
    platform === 'ios'
      ? t('pwa.iosHint')
      : deferredPrompt
        ? t('pwa.defaultHint')
        : t('pwa.manualHint');

  return (
    <div className="pwa-install-popup-backdrop" onClick={dismiss} role="presentation">
      <section
        className="pwa-install-popup-panel glass-panel border"
        style={{ borderColor: 'var(--color-glass-border)' }}
        role="dialog"
        aria-modal="true"
        aria-label={t('pwa.ariaLabel')}
        aria-labelledby="pwa-install-popup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pwa-install-popup-header">
          <div className="flex items-start gap-3 min-w-0">
            <img
              src="/icons/icon-192.png"
              alt=""
              width={48}
              height={48}
              className="w-12 h-12 rounded-xl shrink-0"
              style={{ boxShadow: 'var(--shadow-card)' }}
            />
            <div className="min-w-0">
              <p className="section-label mb-1">{t('pwa.popupLabel')}</p>
              <h3
                id="pwa-install-popup-title"
                className="font-semibold text-lg leading-snug"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('pwa.title')}
              </h3>
              <p
                className="font-mono text-[11px] mt-1.5 leading-relaxed"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {hint}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="pwa-install-popup-close"
            onClick={dismiss}
            aria-label={t('pwa.notNow')}
          >
            ×
          </button>
        </header>

        <div className="pwa-install-popup-body space-y-4">
          <InstallAppGuide compact={false} hideTitle />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {deferredPrompt ? (
              <Button type="button" size="md" onClick={install} className="flex-1 min-w-[8rem]">
                {t('pwa.install')}
              </Button>
            ) : null}
            <Button
              type="button"
              size="md"
              variant={deferredPrompt ? 'ghost' : 'primary'}
              onClick={dismiss}
              className={deferredPrompt ? undefined : 'flex-1'}
            >
              {deferredPrompt ? t('pwa.notNow') : t('pwa.gotIt')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
