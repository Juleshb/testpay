import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { LANGUAGES } from '../i18n';

const SHORT_LABELS = {
  en: 'ENG',
  fr: 'FR',
  sw: 'SW',
};

function GlobeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChevronIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function LanguageSwitcher({ className, size = 'md' }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.split('-')[0] || 'en';
  const isSm = size === 'sm';

  return (
    <div
      className={cn(
        'language-switcher group relative inline-flex shrink-0 items-center rounded-lg border transition-colors duration-150',
        'hover:border-[color-mix(in_srgb,var(--color-accent)_45%,var(--color-glass-border))]',
        'focus-within:border-[color-mix(in_srgb,var(--color-accent)_55%,var(--color-glass-border))]',
        'focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-accent)_18%,transparent)]',
        isSm ? 'h-9 w-[4.25rem] sm:h-10 sm:w-[5.25rem]' : 'h-11 w-[5.25rem] sm:min-w-[6.5rem]',
        className
      )}
      style={{
        borderColor: 'var(--color-glass-border)',
        background: 'color-mix(in srgb, var(--color-surface-700) 55%, transparent)',
      }}
    >
      <GlobeIcon
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 shrink-0 transition-colors duration-150',
          'hidden sm:block group-hover:text-[var(--color-accent)] group-focus-within:text-[var(--color-accent)]',
          isSm ? 'left-2 w-3.5 h-3.5' : 'left-2.5 w-4 h-4'
        )}
        style={{ color: 'var(--color-text-muted)' }}
      />

      <select
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className={cn(
          'language-switcher-select h-full w-full cursor-pointer appearance-none border-0 bg-transparent font-mono font-semibold uppercase tracking-wider outline-none',
          isSm
            ? 'pl-2 pr-6 text-[10px] sm:pl-8 sm:pr-7 sm:text-[11px]'
            : 'pl-2 pr-7 text-xs sm:pl-9 sm:pr-8'
        )}
        style={{ color: 'var(--color-text-primary)' }}
        aria-label={t('language.label')}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {SHORT_LABELS[lang.code] || lang.code.toUpperCase()}
          </option>
        ))}
      </select>

      <ChevronIcon
        className={cn(
          'pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 shrink-0 transition-colors duration-150',
          'group-hover:text-[var(--color-accent)] group-focus-within:text-[var(--color-accent)]',
          isSm ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'
        )}
        style={{ color: 'var(--color-text-muted)' }}
      />
    </div>
  );
}
