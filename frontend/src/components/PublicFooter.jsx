import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { APP_NAME, APP_VERSION, APP_DEVELOPER } from '../lib/appMeta';
import { cn } from '../lib/cn';

export default function PublicFooter({ className, showTagline = false, showHomeLink = false }) {
  const { t } = useTranslation();

  return (
    <footer
      className={cn('text-center font-mono text-[11px] space-y-2', className)}
      style={{ color: 'var(--color-text-muted)' }}
    >
      {showTagline && (
        <p>{t('footer.tagline', { name: APP_NAME })}</p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link to="/terms" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
          {t('common.termsOfUse')}
        </Link>
        <Link to="/privacy" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
          {t('common.privacyPolicy')}
        </Link>
        <Link to="/guide" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
          {t('common.userGuide')}
        </Link>
        <Link to="/docs" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
          {t('common.apiDocs')}
        </Link>
        {showHomeLink && (
          <Link to="/" className="hover:underline">
            {t('common.home')}
          </Link>
        )}
      </div>

      <p>{t('common.version')} {APP_VERSION}</p>
      <p>{t('common.developedBy', { team: APP_DEVELOPER })}</p>
      <p>{t('common.allRights', { year: new Date().getFullYear(), name: APP_NAME })}</p>
    </footer>
  );
}
