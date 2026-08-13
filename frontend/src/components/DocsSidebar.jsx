import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useTranslation } from 'react-i18next';
import { getDocsSiteNavItems } from '../lib/docsNav';

function NavLink({ href, label, active, nested = false, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        'docs-sidebar-link block py-1.5 transition-colors',
        nested ? 'pl-3 text-[0.6875rem]' : 'text-xs',
        active && 'docs-sidebar-link-active'
      )}
    >
      {label}
    </a>
  );
}

export default function DocsSidebar({ pageNav = [], className }) {
  const { t } = useTranslation();
  const location = useLocation();
  const siteNav = getDocsSiteNavItems();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState(pageNav[0]?.id || '');

  useEffect(() => {
    const ids = pageNav.flatMap((item) => [
      item.id,
      ...(item.children?.map((child) => child.id) || []),
    ]);

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.25, 0.5, 1] }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pageNav]);

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  const sidebarBody = (
    <>
      <div className="docs-sidebar-group">
        <p className="docs-sidebar-heading">{t('common.documentation')}</p>
        <ul className="space-y-1">
          {siteNav.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    'docs-sidebar-site-link block rounded-lg px-3 py-2 transition-colors',
                    isActive && 'docs-sidebar-site-link-active'
                  )}
                >
                  <span className="block text-xs font-semibold">{item.label}</span>
                  <span className="block font-mono text-[10px] mt-0.5 docs-sidebar-muted">
                    {item.description}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {pageNav.length > 0 && (
        <div className="docs-sidebar-group">
          <p className="docs-sidebar-heading">{t('common.onThisPage')}</p>
          <ul className="space-y-2">
            {pageNav.map((item) => {
              const sectionActive =
                activeId === item.id ||
                item.children?.some((child) => child.id === activeId);

              return (
                <li key={item.id}>
                  <NavLink
                    href={`#${item.id}`}
                    label={item.label}
                    active={sectionActive}
                    onClick={handleNavClick}
                  />
                  {item.children?.length > 0 && (
                    <ul className="mt-1 space-y-0.5 border-l ml-1.5 pl-2 docs-sidebar-nested">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <NavLink
                            href={`#${child.id}`}
                            label={child.label}
                            active={activeId === child.id}
                            nested
                            onClick={handleNavClick}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <>
      <button
        type="button"
        className="docs-sidebar-mobile-toggle lg:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? t('common.hideContents') : t('common.tableOfContents')}
      </button>

      <aside
        className={cn(
          'docs-sidebar',
          mobileOpen && 'docs-sidebar-open',
          className
        )}
      >
        <div className="docs-sidebar-inner">
          <div className="docs-sidebar-panel glass-panel border p-4">{sidebarBody}</div>
        </div>
      </aside>
    </>
  );
}
