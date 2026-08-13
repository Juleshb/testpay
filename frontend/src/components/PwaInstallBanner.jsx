import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import { hasCookieConsent } from '../lib/cookies';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function PwaInstallBanner() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed || !hasCookieConsent()) return undefined;

    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (!isMobile) return undefined;

    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
      return undefined;
    }

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem('pwa-install-dismissed', '1');
    setVisible(false);
    setDeferredPrompt(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="pwa-install-banner" role="region" aria-label={t('pwa.ariaLabel')}>
      <div className="pwa-install-banner-inner">
        <div className="min-w-0">
          <p className="font-semibold text-sm">{t('pwa.title')}</p>
          <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {showIosHint ? t('pwa.iosHint') : t('pwa.defaultHint')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!showIosHint && deferredPrompt && (
            <Button type="button" size="sm" onClick={install}>
              {t('pwa.install')}
            </Button>
          )}
          <button
            type="button"
            className="font-mono text-xs px-2 py-1"
            style={{ color: 'var(--color-text-muted)' }}
            onClick={dismiss}
          >
            {t('pwa.notNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
