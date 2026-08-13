import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { useCommunityUnread } from '../CommunityUnreadContext';

function NavItem({ to, end, icon: Icon, label, badge = 0, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn('mobile-bottom-nav-link relative', isActive && 'mobile-bottom-nav-link-active')
      }
    >
      <span className="relative">
        <Icon />
        {badge > 0 && (
          <span
            className="absolute -top-1.5 -right-2 min-w-[1rem] h-4 px-1 rounded-full font-mono text-[9px] font-bold flex items-center justify-center"
            style={{ background: 'var(--color-danger)', color: '#fff' }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function MobileBottomNav({ onOpenMenu }) {
  const { t } = useTranslation();
  const { total: communityUnread } = useCommunityUnread();
  const location = useLocation();

  const walletActive = location.pathname === '/transfer' || location.pathname === '/withdraw';

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label={t('nav.mainNav')}>
      <NavItem to="/dashboard" icon={IconDashboard} label={t('nav.home')} />
      <NavItem to="/payments/new" end icon={IconPay} label={t('nav.pay')} />
      <NavLink
        to="/transfer"
        className={cn('mobile-bottom-nav-link', walletActive && 'mobile-bottom-nav-link-active')}
      >
        <IconWallet />
        <span>{t('nav.wallet')}</span>
      </NavLink>
      <NavItem to="/community" icon={IconCommunity} label={t('nav.chat')} badge={communityUnread} />
      <button type="button" className="mobile-bottom-nav-link" onClick={onOpenMenu} aria-label={t('common.menu')}>
        <IconMenu />
        <span>{t('common.menu')}</span>
      </button>
    </nav>
  );
}

function IconDashboard() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
    </svg>
  );
}

function IconPay() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconCommunity() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
