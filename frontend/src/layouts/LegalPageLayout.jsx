import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ui/ThemeToggle';
import PublicFooter from '../components/PublicFooter';

export default function LegalPageLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen min-h-[100dvh]">
      <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <nav className="glass-nav max-w-4xl mx-auto flex items-center justify-between px-3 sm:px-4 py-2">
          <BrandLogo to="/" size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/register"
              className="font-mono text-xs px-3 py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Create account
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
        <article className="glass-panel p-6 sm:p-10">
          <p className="section-label mb-2">Legal</p>
          <h1 className="display-title text-3xl sm:text-4xl mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h1>
          {lastUpdated && (
            <p className="font-mono text-[11px] mb-8" style={{ color: 'var(--color-text-muted)' }}>
              Last updated: {lastUpdated}
            </p>
          )}

          <div
            className="legal-content space-y-6 text-sm leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {children}
          </div>
        </article>

        <PublicFooter className="mt-8" showHomeLink />
      </main>
    </div>
  );
}

export function LegalSection({ title, children }) {
  return (
    <section>
      <h2 className="font-mono text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
