import ThemeToggle from '../components/ui/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import BrandLogo from '../components/BrandLogo';
import { useTranslation } from 'react-i18next';

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen min-h-[100dvh]">
      <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <nav className="glass-nav max-w-5xl mx-auto flex items-center justify-between gap-2 min-w-0 px-3 sm:px-4 py-2">
          <BrandLogo to="/" size="sm" />
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageSwitcher size="sm" />
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="hidden lg:block lg:sticky lg:top-28 space-y-6">
            <p className="eyebrow">{t('auth.eyebrow')}</p>
            <h2 className="display-title text-4xl lg:text-5xl" style={{ color: 'var(--color-text-primary)' }}>
              {t('auth.heroTitle')}
              <br />
              <span className="text-highlight">{t('auth.heroHighlight')}</span>
            </h2>
            <p className="text-base leading-relaxed max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
              {t('auth.heroBody')}
            </p>
          </div>

          <div>
            <div className="mb-6">
              <p className="eyebrow mb-3">{t('auth.account')}</p>
              <h1 className="display-title text-3xl sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                {title}
              </h1>
              {subtitle && (
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {subtitle}
                </p>
              )}
            </div>

            <div className="glass-panel p-4 sm:p-6 lg:p-8">{children}</div>

            {footer && (
              <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-muted)' }}>
                {footer}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
