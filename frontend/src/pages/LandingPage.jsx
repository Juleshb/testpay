import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Button from '../components/ui/Button';
import UserAvatar from '../components/community/UserAvatar';
import { PageLoader } from '../components/ui/Spinner';
import { getPublicShowcase } from '../publicApi';
import PublicFooter from '../components/PublicFooter';
import HelpBot from '../components/HelpBot';
import SubmitReviewPopup from '../components/SubmitReviewPopup';
import { cn } from '../lib/cn';

function StrokeIcon({ children, className }) {
  return (
    <svg
      className={cn('w-5 h-5', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconPayment() {
  return (
    <StrokeIcon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </StrokeIcon>
  );
}

function IconPackages() {
  return (
    <StrokeIcon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </StrokeIcon>
  );
}

function IconWithdraw() {
  return (
    <StrokeIcon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v8m0 0l-3-3m3 3l3-3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 12V7a3 3 0 013-3h4l2 2h4a3 3 0 013 3v5" />
    </StrokeIcon>
  );
}

function IconTransfer() {
  return (
    <StrokeIcon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </StrokeIcon>
  );
}

function IconReferrals() {
  return (
    <StrokeIcon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </StrokeIcon>
  );
}

function IconLoan() {
  return (
    <StrokeIcon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m2 0v-4m0 4V9m12 4V9M9 9h1m4 0h1m-5 4h1m4 0h1" />
    </StrokeIcon>
  );
}

function IconCommunity() {
  return (
    <StrokeIcon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
    </StrokeIcon>
  );
}

function IconMobileApp() {
  return (
    <StrokeIcon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </StrokeIcon>
  );
}

function IconChevronRight({ className }) {
  return (
    <StrokeIcon className={cn('w-4 h-4', className)}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </StrokeIcon>
  );
}

function IconBullet() {
  return (
    <span className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }}>
      <StrokeIcon className="w-3.5 h-3.5">
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      </StrokeIcon>
    </span>
  );
}

const FEATURE_ICON_LIST = [
  IconPayment,
  IconPackages,
  IconWithdraw,
  IconTransfer,
  IconReferrals,
  IconLoan,
  IconCommunity,
  IconMobileApp,
];

const GLANCE_KEYS = ['payments', 'packages', 'withdraw', 'referrals'];
const STAT_KEYS = ['members', 'investments', 'payments', 'rating'];

function StarRating({ rating, size = 'sm' }) {
  const { t } = useTranslation();
  const stars = [1, 2, 3, 4, 5];
  const iconClass = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';

  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={t('landing.testimonials.starRating', { rating })}
    >
      {stars.map((star) => (
        <svg
          key={star}
          className={iconClass}
          viewBox="0 0 20 20"
          fill={star <= rating ? 'var(--color-warning)' : 'color-mix(in srgb, var(--color-text-muted) 35%, transparent)'}
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div
      className="rounded-xl border p-4 sm:p-5 text-center"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
    >
      <p className="display-title text-2xl sm:text-3xl font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
        {value}
      </p>
      <p className="font-mono text-[11px] uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-primary)' }}>
        {label}
      </p>
      {hint && (
        <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function StatsSection() {
  const { t, i18n } = useTranslation();

  const platformStats = useMemo(
    () =>
      STAT_KEYS.map((key) => ({
        label: t(`landing.stats.${key}.label`),
        value: t(`landing.stats.${key}.value`),
        hint: t(`landing.stats.${key}.hint`),
      })),
    [t, i18n.language]
  );

  return (
    <section className="py-8 sm:py-10 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="text-center mb-6 sm:mb-8">
        <p className="section-label mb-2">{t('landing.stats.label')}</p>
        <h2 className="display-title text-2xl sm:text-3xl" style={{ color: 'var(--color-text-primary)' }}>
          {t('landing.stats.title')}
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {platformStats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}

function testimonialSummary(testimonials) {
  if (!testimonials.length) return null;
  const average =
    Math.round((testimonials.reduce((sum, item) => sum + item.rating, 0) / testimonials.length) * 10) / 10;
  return { averageRating: average, reviewCount: testimonials.length };
}

function TestimonialsSection({ testimonials, loading, onReviewSubmitted }) {
  const { t } = useTranslation();
  const summary = testimonialSummary(testimonials);

  return (
    <section className="py-10 sm:py-14 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="text-center mb-8 sm:mb-10">
        <p className="section-label mb-2">{t('landing.testimonials.label')}</p>
        <h2 className="display-title text-3xl sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
          {t('landing.testimonials.title')}
        </h2>
        {!loading && summary?.averageRating > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <StarRating rating={Math.round(summary.averageRating)} size="lg" />
            <p className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {summary.averageRating}/5
              </span>{' '}
              {t('landing.testimonials.averageFrom', { count: summary.reviewCount })}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t('landing.testimonials.loading')}
        </p>
      ) : testimonials.length === 0 ? (
        <p className="text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t('landing.testimonials.empty')}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {testimonials.map((item) => (
            <article
              key={item.id}
              className="glass-panel border p-5 sm:p-6 flex flex-col gap-4 h-full"
              style={{ borderColor: 'var(--color-glass-border)' }}
            >
              <StarRating rating={item.rating} />
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-1">
                <UserAvatar name={item.name} avatarUrl={item.avatarUrl} userId={item.id} size={44} />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {item.name}
                  </p>
                  {item.role && (
                    <p className="font-mono text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {item.role}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <SubmitReviewPopup onSubmitted={onReviewSubmitted} />
    </section>
  );
}

function FeatureCard({ Icon, title, body, tags, className }) {
  return (
    <article
      className={cn('glass-panel border p-5 sm:p-6 flex flex-col gap-3 h-full', className)}
      style={{ borderColor: 'var(--color-glass-border)' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
          color: 'var(--color-accent)',
        }}
      >
        <Icon />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--color-text-secondary)' }}>
        {body}
      </p>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {tags.map((tag) => (
          <span key={tag} className="tag-pill text-[10px]">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

function FlowDiagram() {
  const { t, i18n } = useTranslation();

  const flowSteps = useMemo(
    () => t('landing.flow.steps', { returnObjects: true }),
    [t, i18n.language]
  );

  return (
    <div className="glass-panel border p-5 sm:p-8 overflow-x-auto mobile-scroll-x" style={{ borderColor: 'var(--color-glass-border)' }}>
      <div className="flex items-stretch gap-2 sm:gap-3 min-w-[640px] sm:min-w-0 sm:grid sm:grid-cols-5">
        {flowSteps.map((label, i, arr) => (
          <div key={label} className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[120px] sm:min-w-0">
            <div
              className="flex-1 rounded-xl border p-3 sm:p-4 text-center"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
                background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
              }}
            >
              <p className="font-mono text-[10px] mb-1" style={{ color: 'var(--color-accent)' }}>
                {String(i + 1).padStart(2, '0')}
              </p>
              <p className="font-semibold text-xs sm:text-sm">{label}</p>
            </div>
            {i < arr.length - 1 && (
              <span className="shrink-0 hidden sm:flex items-center" style={{ color: 'var(--color-text-muted)' }}>
                <IconChevronRight />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityTeamsSection({ team, loadingTeam }) {
  const { t, i18n } = useTranslation();

  const bullets = useMemo(
    () => t('landing.community.bullets', { returnObjects: true }),
    [t, i18n.language]
  );

  return (
    <section className="py-10 sm:py-14 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
        <div>
          <p className="section-label mb-2">{t('landing.community.label')}</p>
          <h2 className="display-title text-3xl sm:text-4xl mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {t('landing.community.title')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed mb-5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('landing.community.body')}
          </p>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {bullets.map((line) => (
              <li key={line} className="flex gap-2">
                <IconBullet />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel border p-6 sm:p-8" style={{ borderColor: 'var(--color-glass-border)' }}>
          <p className="section-label mb-4">{t('landing.community.leadershipLabel')}</p>
          {loadingTeam ? (
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('landing.community.loadingTeam')}
            </p>
          ) : team.length === 0 ? (
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('landing.community.emptyTeam')}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
              {team.map((member) => (
                <div key={member.id} className="text-center">
                  <UserAvatar
                    name={member.displayName || member.name}
                    avatarUrl={member.avatarUrl}
                    userId={member.id}
                    size={56}
                    className="mx-auto"
                  />
                  <p
                    className="font-mono text-[11px] mt-2 truncate font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {member.displayName || member.name}
                  </p>
                  <p className="font-mono text-[10px] truncate" style={{ color: 'var(--color-accent)' }}>
                    {member.role}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const [showcase, setShowcase] = useState(null);
  const [showcaseLoading, setShowcaseLoading] = useState(true);

  const membersLabel = useMemo(() => t('landing.stats.members.value'), [t, i18n.language]);

  const heroTags = useMemo(
    () => [t('landing.heroTags.noCard'), t('landing.heroTags.multiChain'), t('landing.heroTags.mobileApp')],
    [t, i18n.language]
  );

  const glanceItems = useMemo(
    () =>
      GLANCE_KEYS.map((key) => ({
        label: t(`landing.glance.${key}.label`),
        value: t(`landing.glance.${key}.value`),
      })),
    [t, i18n.language]
  );

  const whyStackPay = useMemo(
    () => t('landing.why.items', { returnObjects: true }),
    [t, i18n.language]
  );

  const howItWorks = useMemo(
    () => t('landing.howItWorks.items', { returnObjects: true }),
    [t, i18n.language]
  );

  const features = useMemo(() => {
    const items = t('landing.features.items', { returnObjects: true });
    return FEATURE_ICON_LIST.map((Icon, i) => ({
      Icon,
      title: items[i]?.title,
      body: items[i]?.body,
      tags: items[i]?.tags || [],
    }));
  }, [t, i18n.language]);

  const networks = useMemo(
    () => t('landing.networks.list', { returnObjects: true }),
    [t, i18n.language]
  );

  const balanceItems = useMemo(
    () => t('landing.balance.items', { returnObjects: true }),
    [t, i18n.language]
  );

  useEffect(() => {
    getPublicShowcase()
      .then((data) => setShowcase(data))
      .catch(() => setShowcase(null))
      .finally(() => setShowcaseLoading(false));
  }, []);

  const reloadShowcase = () => {
    getPublicShowcase()
      .then((data) => setShowcase(data))
      .catch(() => setShowcase(null));
  };

  if (loading) return <PageLoader message={t('common.loading')} />;

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen min-h-[100dvh]">
      <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <nav className="glass-nav max-w-6xl mx-auto flex items-center justify-between gap-2 min-w-0 px-3 sm:px-4 py-2">
          <BrandLogo to="/" size="sm" />
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageSwitcher size="sm" />
            <ThemeToggle />
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="md">
                {t('landing.logIn')}
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">{t('landing.getStarted')}</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
        <section className="py-10 sm:py-16 lg:py-20 text-center lg:text-left">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="space-y-6">
              <p className="eyebrow">{t('landing.eyebrow')}</p>
              <h1 className="display-title text-4xl sm:text-5xl lg:text-6xl" style={{ color: 'var(--color-text-primary)' }}>
                {t('landing.heroTitle1')}
                <br />
                <span className="text-highlight">{t('landing.heroTitle2')}</span>
              </h1>
              <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0" style={{ color: 'var(--color-text-secondary)' }}>
                {t('landing.heroBody')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/register">
                  <Button size="md" className="w-full sm:w-auto px-8 py-3">
                    {t('landing.createFreeAccount')}
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost" size="md" className="w-full sm:w-auto px-8 py-3">
                    {t('landing.alreadyHaveAccount')}
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {heroTags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('landing.membersJoined', { count: membersLabel })}
              </p>
            </div>

            <div
              className="glass-panel border p-6 sm:p-8 text-left space-y-5"
              style={{ borderColor: 'var(--color-glass-border)' }}
            >
              <p className="section-label">{t('landing.atAGlance')}</p>
              <div className="grid grid-cols-2 gap-3">
                {glanceItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border p-3 sm:p-4"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-accent)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs sm:text-sm font-medium leading-snug">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {t('landing.dashboardHint')}
              </p>
            </div>
          </div>
        </section>

        <StatsSection />

        <section className="py-10 sm:py-14 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-center mb-8 sm:mb-10">
            <p className="section-label mb-2">{t('landing.why.label')}</p>
            <h2 className="display-title text-3xl sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
              {t('landing.why.title')}
            </h2>
            <p className="mt-3 text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {t('landing.why.subtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {whyStackPay.map((item) => (
              <article
                key={item.title}
                className="glass-panel border p-5 sm:p-6"
                style={{ borderColor: 'var(--color-glass-border)' }}
              >
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-10 sm:py-14 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-center mb-8 sm:mb-10">
            <p className="section-label mb-2">{t('landing.flow.label')}</p>
            <h2 className="display-title text-3xl sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
              {t('landing.flow.title')}
            </h2>
            <p className="mt-3 text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {t('landing.flow.subtitle')}
            </p>
          </div>
          <FlowDiagram />
        </section>

        <section className="py-10 sm:py-14 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="mb-8 sm:mb-10">
            <p className="section-label mb-2">{t('landing.howItWorks.label')}</p>
            <h2 className="display-title text-3xl sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
              {t('landing.howItWorks.title')}
            </h2>
          </div>
          <ol className="space-y-4 sm:space-y-5">
            {howItWorks.map((item) => (
              <li
                key={item.step}
                className="glass-panel border p-5 sm:p-6 flex gap-4 sm:gap-6"
                style={{ borderColor: 'var(--color-glass-border)' }}
              >
                <span
                  className="shrink-0 w-12 h-12 rounded-xl font-mono text-sm font-bold flex items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
                    color: 'var(--color-accent)',
                    border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
                  }}
                >
                  {item.step}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-10 sm:py-14 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-center mb-8 sm:mb-10">
            <p className="section-label mb-2">{t('landing.features.label')}</p>
            <h2 className="display-title text-3xl sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
              {t('landing.features.title')}
            </h2>
            <p className="mt-3 text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {t('landing.features.subtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section className="py-10 sm:py-14 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="glass-panel border p-6 sm:p-8" style={{ borderColor: 'var(--color-glass-border)' }}>
              <p className="section-label mb-3">{t('landing.networks.label')}</p>
              <h2 className="display-title text-2xl sm:text-3xl mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {t('landing.networks.title')}
              </h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('landing.networks.body')}
              </p>
              <div className="flex flex-wrap gap-2">
                {networks.map((network) => (
                  <span key={network} className="tag-pill">
                    {network}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-panel border p-6 sm:p-8" style={{ borderColor: 'var(--color-glass-border)' }}>
              <p className="section-label mb-3">{t('landing.balance.label')}</p>
              <h2 className="display-title text-2xl sm:text-3xl mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {t('landing.balance.title')}
              </h2>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {balanceItems.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <IconBullet />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <TestimonialsSection
          testimonials={showcase?.testimonials || []}
          loading={showcaseLoading}
          onReviewSubmitted={reloadShowcase}
        />

        <CommunityTeamsSection team={showcase?.communityTeam || []} loadingTeam={showcaseLoading} />

        <section className="py-12 sm:py-16">
          <div
            className="glass-panel border p-8 sm:p-12 text-center rounded-2xl"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
              background: 'linear-gradient(145deg, color-mix(in srgb, var(--color-accent) 10%, var(--color-surface-800)), var(--color-surface-900))',
            }}
          >
            <p className="eyebrow mb-3">{t('landing.cta.eyebrow')}</p>
            <h2 className="display-title text-3xl sm:text-4xl mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {t('landing.cta.title')}
            </h2>
            <p className="text-sm sm:text-base max-w-lg mx-auto mb-8" style={{ color: 'var(--color-text-secondary)' }}>
              {t('landing.cta.body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button size="md" className="w-full sm:w-auto px-10 py-3">
                  {t('landing.cta.signUpFree')}
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="md" className="w-full sm:w-auto px-10 py-3">
                  {t('landing.logIn')}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <PublicFooter className="pb-6" showTagline />
      </main>
      <HelpBot />
    </div>
  );
}
