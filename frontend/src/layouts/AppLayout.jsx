import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { userDisplayId } from '../auth';
import { cn } from '../lib/cn';
import BrandLogo from '../components/BrandLogo';
import UserAvatar from '../components/community/UserAvatar';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { APP_NAME, APP_VERSION } from '../lib/appMeta';
import MobileBottomNav from '../components/MobileBottomNav';
import { useCommunityUnread, UnreadBadge } from '../CommunityUnreadContext';
import OnlineUsersBadge from '../components/OnlineUsersBadge';
import HelpBot from '../components/HelpBot';
import { usePresenceHeartbeat } from '../hooks/usePresenceHeartbeat';

function SidebarLink({ to, end, icon: Icon, children, onClick, badge = 0 }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => cn('dev-sidebar-link', isActive && 'dev-sidebar-link-active')}
    >
      <Icon />
      <span className="flex-1 min-w-0 truncate">{children}</span>
      <UnreadBadge count={badge} />
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  const { t } = useTranslation();
  const { user, logoutUser } = useAuth();
  const { total: communityUnread } = useCommunityUnread();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
    onNavigate?.();
  };

  return (
    <>
      <div className="p-5 border-b shrink-0" style={{ borderColor: 'var(--color-glass-border)' }}>
        <BrandLogo />
      </div>

      <nav className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto">
        <div>
          <p className="section-label px-2 mb-2">{t('nav.overview')}</p>
          <div className="space-y-1">
            <SidebarLink to="/dashboard" icon={IconDashboard} onClick={onNavigate}>
              {t('nav.dashboard')}
            </SidebarLink>
          </div>
        </div>

        <div>
          <p className="section-label px-2 mb-2">{t('nav.payments')}</p>
          <div className="space-y-1">
            <SidebarLink to="/payments/new" end icon={IconPay} onClick={onNavigate}>
              {t('nav.newPayment')}
            </SidebarLink>
            <SidebarLink to="/payments/recent" icon={IconRecent} onClick={onNavigate}>
              {t('nav.recentPayments')}
            </SidebarLink>
            <SidebarLink to="/payments" end icon={IconList} onClick={onNavigate}>
              {t('nav.managePayments')}
            </SidebarLink>
          </div>
        </div>

        <div>
          <p className="section-label px-2 mb-2">{t('nav.wallet')}</p>
          <div className="space-y-1">
            <SidebarLink to="/transfer" icon={IconTransfer} onClick={onNavigate}>
              {t('nav.transfer')}
            </SidebarLink>
            <SidebarLink to="/withdraw" end icon={IconWithdraw} onClick={onNavigate}>
              {t('nav.withdraw')}
            </SidebarLink>
            <SidebarLink to="/withdraw/history" icon={IconWithdrawHistory} onClick={onNavigate}>
              {t('nav.withdrawHistory')}
            </SidebarLink>
            <SidebarLink to="/referrals" icon={IconReferrals} onClick={onNavigate}>
              {t('nav.invitations')}
            </SidebarLink>
            <SidebarLink to="/loan" icon={IconLoan} onClick={onNavigate}>
              {t('nav.loan')}
            </SidebarLink>
          </div>
        </div>

        <div>
          <p className="section-label px-2 mb-2">{t('nav.packages')}</p>
          <div className="space-y-1">
            <SidebarLink to="/packages" end icon={IconPackages} onClick={onNavigate}>
              {t('nav.browsePackages')}
            </SidebarLink>
            <SidebarLink to="/packages/portfolio" icon={IconPortfolio} onClick={onNavigate}>
              {t('nav.myPortfolio')}
            </SidebarLink>
          </div>
        </div>

        <div>
          <p className="section-label px-2 mb-2">{t('nav.mining')}</p>
          <div className="space-y-1">
            <SidebarLink to="/mining" end icon={IconMining} onClick={onNavigate}>
              {t('nav.browseMining')}
            </SidebarLink>
            <SidebarLink to="/mining/portfolio" icon={IconPortfolio} onClick={onNavigate}>
              {t('nav.myMiners')}
            </SidebarLink>
          </div>
        </div>

        <div>
          <p className="section-label px-2 mb-2">{t('nav.community')}</p>
          <div className="space-y-1">
            <SidebarLink to="/community" icon={IconCommunity} onClick={onNavigate} badge={communityUnread}>
              {t('nav.community')}
            </SidebarLink>
          </div>
        </div>

        <div>
          <p className="section-label px-2 mb-2">{t('nav.platform')}</p>
          <div className="space-y-1">
            <SidebarLink to="/networks" icon={IconNetworks} onClick={onNavigate}>
              {t('nav.networks')}
            </SidebarLink>
            {isAdmin && (
              <>
                <SidebarLink to="/admin" end icon={IconAdmin} onClick={onNavigate}>
                  {t('nav.systemAdmin')}
                </SidebarLink>
                <SidebarLink to="/admin/reports" icon={IconReport} onClick={onNavigate}>
                  {t('nav.reports')}
                </SidebarLink>
                <SidebarLink to="/admin/payments/recent" icon={IconRecent} onClick={onNavigate}>
                  {t('nav.allRecentPayments')}
                </SidebarLink>
                <SidebarLink to="/admin/users" icon={IconUsers} onClick={onNavigate}>
                  {t('nav.users')}
                </SidebarLink>
                <SidebarLink to="/admin/conversations" icon={IconCommunity} onClick={onNavigate}>
                  {t('nav.userMessages')}
                </SidebarLink>
                <SidebarLink to="/admin/packages" icon={IconPackages} onClick={onNavigate}>
                  {t('nav.packages')}
                </SidebarLink>
                <SidebarLink to="/admin/mining" icon={IconMining} onClick={onNavigate}>
                  {t('nav.mining')}
                </SidebarLink>
                <SidebarLink to="/admin/referrals" icon={IconReferrals} onClick={onNavigate}>
                  {t('nav.referrals')}
                </SidebarLink>
                <SidebarLink to="/admin/withdrawals" icon={IconWithdraw} onClick={onNavigate}>
                  {t('nav.withdrawSettings')}
                </SidebarLink>
                <SidebarLink to="/admin/showcase-team" icon={IconCommunity} onClick={onNavigate}>
                  {t('nav.landingTeam')}
                </SidebarLink>
                <SidebarLink to="/admin/testimonials" icon={IconCommunity} onClick={onNavigate}>
                  {t('nav.reviews')}
                </SidebarLink>
              </>
            )}
            <SidebarLink to="/settings" icon={IconSettings} onClick={onNavigate}>
              {t('nav.settings')}
            </SidebarLink>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t space-y-3 shrink-0" style={{ borderColor: 'var(--color-glass-border)' }}>
        <div className="glass-panel p-3">
          <p className="section-label text-[10px] mb-2">{t('common.session')}</p>
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar
              name={userDisplayId(user)}
              avatarUrl={user?.avatarUrl}
              userId={user?.id}
              size={36}
            />
            <p className="font-mono text-xs truncate min-w-0" style={{ color: 'var(--color-text-primary)' }}>
              {userDisplayId(user)}
            </p>
          </div>
          {isAdmin && (
            <span
              className="inline-block mt-2 font-mono text-[10px] px-2 py-0.5 rounded-full"
              style={{
                color: 'var(--color-warning)',
                background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)',
              }}
            >
              {t('common.admin')}
            </span>
          )}
          <p className="font-mono text-[10px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
            {APP_NAME} v{APP_VERSION}
          </p>
          <div className="mt-2">
            <OnlineUsersBadge />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher size="sm" />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="dev-sidebar-link flex-1 text-left"
            style={{ color: 'var(--color-danger)' }}
          >
            <IconLogout />
            <span>{t('common.signOut')}</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  usePresenceHeartbeat(true);

  return (
    <div className="app-layout-shell min-h-screen min-h-[100dvh] lg:min-h-screen">
      {/* Desktop sidebar — fixed */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col glass-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 flex flex-col glass-sidebar shadow-2xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column — offset for fixed sidebar on desktop */}
      <div className="app-layout-column flex flex-col min-h-[100dvh] min-w-0 lg:pl-64 lg:min-h-screen">
        <main className="app-layout-main flex-1 p-3 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:pt-8 mobile-main-pad min-w-0 overflow-x-hidden flex flex-col">
          <Outlet />
        </main>

        <MobileBottomNav onOpenMenu={() => setMobileOpen(true)} />
      </div>

      <HelpBot context="app" />
    </div>
  );
}

function IconPay() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconList() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function IconRecent() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-6m4 6V7m4 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
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

function IconWithdraw() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v8m0 0l-3-3m3 3l3-3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 12V7a3 3 0 013-3h4l2 2h4a3 3 0 013 3v5" />
    </svg>
  );
}

function IconWithdrawHistory() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function IconTransfer() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function IconReferrals() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function IconLoan() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconPackages() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function IconPortfolio() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  );
}

function IconMining() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
      />
    </svg>
  );
}

function IconNetworks() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}
