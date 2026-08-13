import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import DocsSidebar from '../components/DocsSidebar';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ui/ThemeToggle';
import PublicFooter from '../components/PublicFooter';

export default function DocsPageLayout({
  title,
  subtitle,
  sectionLabel,
  sidebarNav = [],
  children,
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen min-h-[100dvh]">
      <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <nav className="glass-nav max-w-7xl mx-auto flex items-center justify-between gap-2 min-w-0 px-3 sm:px-4 py-2">
          <BrandLogo to="/" size="sm" />
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageSwitcher size="sm" />
            <ThemeToggle />
            <Link
              to="/register"
              className="hidden sm:inline font-mono text-xs px-3 py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              {t('common.createAccount')}
            </Link>
          </div>
        </nav>
      </header>

      <main className="docs-layout max-w-7xl mx-auto px-4 sm:px-6 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        <DocsSidebar pageNav={sidebarNav} />

        <div className="docs-main min-w-0">
          <article className="glass-panel p-6 sm:p-10">
            <p className="section-label mb-2">{sectionLabel || t('common.documentation')}</p>
            <h1 className="display-title text-3xl sm:text-4xl mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base mb-8 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {subtitle}
              </p>
            )}

            <div
              className="docs-content space-y-8 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {children}
            </div>
          </article>

          <PublicFooter className="mt-8" showHomeLink />
        </div>
      </main>
    </div>
  );
}

export function DocSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="font-mono text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function DocEndpoint({ method, path, auth, description, body, response }) {
  return (
    <article className="docs-endpoint">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`docs-method docs-method-${method.toLowerCase()}`}>{method}</span>
        <code className="docs-path">{path}</code>
        {auth && <span className="docs-auth">{auth}</span>}
      </div>
      {description && <p className="mb-3">{description}</p>}
      {body && (
        <div className="mb-3">
          <p className="docs-label">Request body</p>
          <pre className="docs-code">{body}</pre>
        </div>
      )}
      {response && (
        <div>
          <p className="docs-label">Example response</p>
          <pre className="docs-code">{response}</pre>
        </div>
      )}
    </article>
  );
}

export function DocCode({ children }) {
  return <pre className="docs-code">{children}</pre>;
}

/** @deprecated Use DocsPageLayout sidebarNav prop instead */
export function DocNav({ items }) {
  return (
    <nav className="docs-nav lg:hidden">
      <p className="docs-label mb-2">On this page</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="docs-nav-link">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
