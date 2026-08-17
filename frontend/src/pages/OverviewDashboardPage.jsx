import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDashboardStats } from '../api';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import BarRow from '../components/ui/BarRow';
import { Card, CardContent, CardTitle } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import LiveQuotes from '../components/LiveQuotes';

const QUICK_LINKS = [
  { to: '/payments/new', labelKey: 'dashboard.quickDeposit', hintKey: 'dashboard.quickDepositHint' },
  { to: '/packages', labelKey: 'dashboard.quickPackages', hintKey: 'dashboard.quickPackagesHint' },
  { to: '/mining', labelKey: 'dashboard.quickMining', hintKey: 'dashboard.quickMiningHint' },
];

export default function OverviewDashboardPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    getDashboardStats()
      .then((stats) => {
        setData(stats);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) return <PageLoader message={t('pageCommon.loading.dashboard')} />;

  if (error && !data) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="font-mono text-sm mb-4" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
        <Button size="md" onClick={load}>
          {t('pageCommon.retry')}
        </Button>
      </div>
    );
  }

  const { overview, volume, breakdown, recentPayments, balance } = data;
  const maxNetwork = Math.max(...breakdown.byNetwork.map((n) => n.count), 1);
  const maxToken = Math.max(...breakdown.byToken.map((tok) => tok.count), 1);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={t('dashboard.title')}
        label={t('dashboard.label')}
        description={t('dashboard.description')}
        actions={
          <div className="mobile-action-grid">
            <Link to="/withdraw" className="min-w-0">
              <Button variant="ghost" size="md" className="w-full sm:w-auto">
                {t('dashboard.withdraw')}
              </Button>
            </Link>
            <Link to="/transfer" className="min-w-0">
              <Button variant="ghost" size="md" className="w-full sm:w-auto">
                {t('dashboard.transfer')}
              </Button>
            </Link>
            <Link to="/payments/new" className="min-w-0 sm:col-span-2">
              <Button size="md" className="w-full sm:w-auto">
                {t('dashboard.newPayment')}
              </Button>
            </Link>
          </div>
        }
      />

      <section>
        <p className="section-label mb-3">{t('dashboard.quickLinks')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="glass-panel p-4 block transition-colors hover:border-[color-mix(in_srgb,var(--color-accent)_45%,transparent)]"
            >
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {t(item.labelKey)}
              </p>
              <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {t(item.hintKey)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="section-label mb-4">{t('dashboard.accountBalance')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label={t('dashboard.available')}
            value={`$${balance?.availableUsd ?? '0.00'}`}
            hint={t('dashboard.availableHint')}
            color="text-[var(--color-accent)]"
          />
          <StatCard
            label={t('dashboard.miningBalance')}
            value={`$${parseFloat(balance?.miningBalanceUsd || '0').toFixed(4)}`}
            hint={t('dashboard.miningBalanceHint')}
            color="text-[var(--color-success)]"
          />
          <StatCard label={t('dashboard.totalPaid')} value={`$${balance?.totalPaidUsd ?? '0.00'}`} />
          <StatCard label={t('dashboard.invested')} value={`$${balance?.totalDebitedUsd ?? '0.00'}`} />
          <StatCard
            label={t('dashboard.confirmedPayments')}
            value={overview.confirmedPaymentCount ?? overview.completed}
            color="text-[var(--color-success)]"
          />
        </div>
        <p className="font-mono text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
          {t('dashboard.balanceHint')}
        </p>
      </section>

      <LiveQuotes />

      <section>
        <p className="section-label mb-4">{t('dashboard.statistics')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label={t('dashboard.total')} value={overview.total} />
          <StatCard label={t('dashboard.today')} value={overview.paymentsToday} color="text-[var(--color-accent)]" />
          <StatCard label={t('dashboard.pending')} value={overview.pending} color="text-[var(--color-warning)]" />
          <StatCard label={t('dashboard.confirmed')} value={overview.confirmed + overview.swept} color="text-[var(--color-success)]" />
          <StatCard label={t('dashboard.success')} value={`${overview.successRate}%`} color="text-[var(--color-success)]" />
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <CardTitle className="section-label text-xs mb-4">{t('dashboard.volume')}</CardTitle>
            <dl className="space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <dt style={{ color: 'var(--color-text-secondary)' }}>{t('dashboard.requests')}</dt>
                <dd>{volume.totalRequests}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--color-text-secondary)' }}>{t('dashboard.totalAmount')}</dt>
                <dd style={{ color: 'var(--color-accent)' }}>{volume.approximateVolume}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--color-text-secondary)' }}>{t('dashboard.confirmedUsd')}</dt>
                <dd style={{ color: 'var(--color-success)' }}>${volume.totalPaidUsd ?? '0.00'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <CardTitle className="section-label text-xs mb-4">{t('dashboard.byNetwork')}</CardTitle>
            <div className="space-y-3">
              {breakdown.byNetwork.length === 0 ? (
                <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('pageCommon.noData')}
                </p>
              ) : (
                breakdown.byNetwork.slice(0, 6).map((n) => (
                  <BarRow key={n.name} label={n.name} count={n.count} max={maxNetwork} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <CardTitle className="section-label text-xs mb-4">{t('dashboard.byToken')}</CardTitle>
            <div className="space-y-3">
              {breakdown.byToken.length === 0 ? (
                <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('pageCommon.noData')}
                </p>
              ) : (
                breakdown.byToken.slice(0, 6).map((tok) => (
                  <BarRow key={tok.symbol} label={tok.symbol} count={tok.count} max={maxToken} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">{t('dashboard.recentPayments')}</p>
          <Link
            to="/payments/recent"
            className="font-mono text-xs hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('pageCommon.viewAll')}
          </Link>
        </div>
        <div className="hidden md:block glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b font-mono text-xs uppercase tracking-wider text-left"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <th className="px-4 py-3">{t('pageCommon.amount')}</th>
                  <th className="px-4 py-3">{t('pageCommon.network')}</th>
                  <th className="px-4 py-3">{t('pageCommon.status')}</th>
                  <th className="px-4 py-3">{t('pageCommon.date')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t('dashboard.noPaymentsYet')}{' '}
                      <Link to="/payments/new" className="underline" style={{ color: 'var(--color-accent)' }}>
                        {t('pageCommon.createOne')}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b hover:bg-white/[0.02]"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                    >
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {p.amount} {p.tokenSymbol}
                        {p.usdAmount && (
                          <span className="block text-[10px]" style={{ color: 'var(--color-success)' }}>
                            {t('pageCommon.usdApprox', { amount: p.usdAmount })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {p.networkName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={p.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/pay/${p.id}`} className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                          {t('pageCommon.open')}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-3">
          {recentPayments.length === 0 ? (
            <div className="glass-panel p-6 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('dashboard.noPaymentsYet')}{' '}
              <Link to="/payments/new" className="underline" style={{ color: 'var(--color-accent)' }}>
                {t('pageCommon.createOne')}
              </Link>
            </div>
          ) : (
            recentPayments.map((p) => (
              <Link
                key={p.id}
                to={`/pay/${p.id}`}
                className="block glass-panel p-4 transition-colors hover:border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold tabular-nums">
                      {p.amount} {p.tokenSymbol}
                    </p>
                    {p.usdAmount && (
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-success)' }}>
                        {t('pageCommon.usdApprox', { amount: p.usdAmount })}
                      </p>
                    )}
                    <p className="font-mono text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {p.networkName}
                    </p>
                  </div>
                  <Badge status={p.status} />
                </div>
                <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(p.createdAt).toLocaleString()}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
