import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import { cn } from '../lib/cn';

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

export function detectInstallPlatform() {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/macintosh|mac os x/i.test(ua) && 'ontouchend' in document) return 'ios'; // iPadOS
  return 'desktop';
}

/**
 * Teach browser users how to install StackPay as an app.
 * @param {{ compact?: boolean, className?: string, deferredPrompt?: Event | null, onInstall?: () => void }} props
 */
export default function InstallAppGuide({
  compact = false,
  hideTitle = false,
  className = '',
  deferredPrompt = null,
  onInstall,
}) {
  const { t } = useTranslation();
  const platform = useMemo(() => detectInstallPlatform(), []);
  const [open, setOpen] = useState(!compact);
  const installed = isStandaloneDisplay();

  if (installed) {
    return (
      <div className={cn(className)}>
        <p className="font-mono text-xs" style={{ color: 'var(--color-success)' }}>
          {t('pwa.alreadyInstalled')}
        </p>
      </div>
    );
  }

  const stepsKey =
    platform === 'ios' ? 'pwa.stepsIos' : platform === 'android' ? 'pwa.stepsAndroid' : 'pwa.stepsDesktop';
  const steps = t(stepsKey, { returnObjects: true });
  const stepList = Array.isArray(steps) ? steps : [];

  return (
    <div className={cn('space-y-3', className)}>
      {!hideTitle && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm">{t('pwa.howToTitle')}</p>
            <p className="font-mono text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {t('pwa.howToHint')}
            </p>
          </div>
          {compact && (
            <button
              type="button"
              className="font-mono text-xs shrink-0 px-2 py-1 rounded-lg"
              style={{
                color: 'var(--color-accent)',
                background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              }}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? t('pwa.hideSteps') : t('pwa.showSteps')}
            </button>
          )}
        </div>
      )}

      {deferredPrompt && onInstall && (
        <Button type="button" size="sm" onClick={onInstall}>
          {t('pwa.install')}
        </Button>
      )}

      {open && (
        <ol className="space-y-2 pl-0 list-none">
          {stepList.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
              <span
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold mt-0.5"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)',
                  color: 'var(--color-accent)',
                }}
              >
                {i + 1}
              </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
