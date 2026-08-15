import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAdminReport } from '../adminApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

function EmptyLine({ text }) {
  return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{text}</p>;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function usd(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function UserLink({ user }) {
  if (!user?.id) return <span>{user?.label || '—'}</span>;
  return (
    <Link to={`/admin/users/${user.id}`} className="hover:underline" style={{ color: 'var(--color-accent)' }}>
      {user.label}
    </Link>
  );
}

function RankTable({ rows, empty, columns }) {
  if (!rows?.length) {
    return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left section-label">
            {columns.map((col) => (
              <th key={col.key} className="py-2 pr-3 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.userId || row.rank} className="border-t" style={{ borderColor: 'var(--color-glass-border)' }}>
              {columns.map((col) => (
                <td key={col.key} className="py-2.5 pr-3 tabular-nums">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminReportPage() {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayUtc);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (selectedDate) => {
    try {
      setError('');
      setData(await getAdminReport({ date: selectedDate }));
    } catch (err) {
      setError(err.message || t('admin.reportPage.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load(date);
  }, [date]);

  const snapshot = data?.snapshot;
  const maxTrend = useMemo(() => {
    if (!data?.trend?.length) return 1;
    return Math.max(
      1,
      ...data.trend.map((d) => Math.max(parseFloat(d.depositsUsd) || 0, parseFloat(d.investedUsd) || 0, parseFloat(d.withdrawnUsd) || 0))
    );
  }, [data]);

  if (loading && !data) return <PageLoader message={t('pageCommon.loading.report')} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('admin.reportPage.title')}
        label={t('admin.reportPage.label')}
        description={t('admin.reportPage.description')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={date}
              max={todayUtc()}
              onChange={(e) => setDate(e.target.value || todayUtc())}
              className="dev-input min-h-[2.75rem] px-3"
            />
            <Button variant="ghost" size="md" onClick={() => setDate(todayUtc())}>
              {t('pageCommon.today')}
            </Button>
            <Link to="/admin">
              <Button variant="ghost" size="md">
                {t('admin.systemDashboard')}
              </Button>
            </Link>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {snapshot && (
        <>
          <section className="space-y-3">
            <p className="section-label">
              {t('admin.reportPage.dayLabel', { date: data.date })} · {data.timezone}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t('admin.reportPage.deposits')} value={usd(snapshot.depositsUsd)} hint={`${snapshot.deposits} ${t('admin.reportPage.txns')}`} />
              <StatCard label={t('admin.reportPage.invested')} value={usd(snapshot.investedUsd)} hint={t('admin.reportPage.packagesAndMining')} />
              <StatCard label={t('admin.reportPage.withdrawn')} value={usd(snapshot.withdrawnUsd)} hint={`${snapshot.withdrawals} ${t('admin.reportPage.completed')}`} />
              <StatCard label={t('admin.reportPage.newUsers')} value={snapshot.newUsers} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t('admin.reportPage.packages')} value={usd(snapshot.packagesUsd)} hint={`${snapshot.packageInvestments}`} />
              <StatCard label={t('admin.reportPage.mining')} value={usd(snapshot.miningUsd)} hint={`${snapshot.miningPositions}`} />
              <StatCard label={t('admin.reportPage.fees')} value={usd(snapshot.withdrawFeesUsd)} />
              <StatCard label={t('admin.reportPage.referrals')} value={usd(snapshot.referralUsd)} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t('admin.reportPage.transfers')} value={usd(snapshot.transferUsd)} hint={`${snapshot.transfers}`} />
              <StatCard label={t('admin.reportPage.loans')} value={usd(snapshot.loanUsd)} hint={`${snapshot.loans}`} />
              <StatCard label={t('admin.reportPage.failedWithdrawals')} value={snapshot.failedWithdrawals} />
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="glass-panel p-4 sm:p-5 space-y-3">
              <p className="section-label">{t('admin.reportPage.bestInvestor')}</p>
              {data.best?.investor ? (
                <div>
                  <p className="text-xl font-semibold">
                    <UserLink user={data.best.investor.user} />
                  </p>
                  <p className="text-2xl font-mono font-bold mt-1">{usd(data.best.investor.totalUsd)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {t('admin.reportPage.packages')}: {usd(data.best.investor.packagesUsd)} · {t('admin.reportPage.mining')}: {usd(data.best.investor.miningUsd)}
                  </p>
                </div>
              ) : (
                <EmptyLine text={t('admin.reportPage.noInvestors')} />
              )}
            </div>
            <div className="glass-panel p-4 sm:p-5 space-y-3">
              <p className="section-label">{t('admin.reportPage.bestDepositor')}</p>
              {data.best?.depositor ? (
                <div>
                  <p className="text-xl font-semibold">
                    <UserLink user={data.best.depositor.user} />
                  </p>
                  <p className="text-2xl font-mono font-bold mt-1">{usd(data.best.depositor.totalUsd)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {data.best.depositor.count} {t('admin.reportPage.deposits')}
                  </p>
                </div>
              ) : (
                <EmptyLine text={t('admin.reportPage.noDepositors')} />
              )}
            </div>
          </section>

          <section className="glass-panel p-4 sm:p-5 space-y-4">
            <p className="section-label">{t('admin.reportPage.trend')}</p>
            <div className="grid grid-cols-7 gap-2 items-end min-h-[120px]">
              {data.trend.map((day) => {
                const invested = parseFloat(day.investedUsd) || 0;
                const height = `${Math.max(8, (invested / maxTrend) * 100)}%`;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 h-[120px] justify-end">
                    <div
                      className="w-full rounded-t"
                      style={{ height, background: 'var(--color-accent)', opacity: day.date === data.date ? 1 : 0.45 }}
                      title={`${day.date}: ${usd(day.investedUsd)}`}
                    />
                    <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.reportPage.trendHint')}
            </p>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="glass-panel p-4 sm:p-5 space-y-3">
              <p className="section-label">{t('admin.reportPage.topInvestors')}</p>
              <RankTable
                rows={data.topInvestors}
                empty={t('admin.reportPage.noInvestors')}
                columns={[
                  { key: 'rank', label: '#', render: (r) => r.rank },
                  { key: 'user', label: t('pageCommon.user'), render: (r) => <UserLink user={r.user} /> },
                  { key: 'total', label: t('admin.reportPage.invested'), render: (r) => usd(r.totalUsd) },
                ]}
              />
            </div>
            <div className="glass-panel p-4 sm:p-5 space-y-3">
              <p className="section-label">{t('admin.reportPage.topDepositors')}</p>
              <RankTable
                rows={data.topDepositors}
                empty={t('admin.reportPage.noDepositors')}
                columns={[
                  { key: 'rank', label: '#', render: (r) => r.rank },
                  { key: 'user', label: t('pageCommon.user'), render: (r) => <UserLink user={r.user} /> },
                  { key: 'total', label: t('admin.reportPage.deposits'), render: (r) => usd(r.totalUsd) },
                ]}
              />
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="glass-panel p-4 sm:p-5 space-y-3">
              <p className="section-label">{t('admin.reportPage.byToken')}</p>
              {data.breakdown.byToken.length ? (
                <ul className="space-y-2">
                  {data.breakdown.byToken.map((row) => (
                    <li key={row.symbol} className="flex justify-between text-sm">
                      <span>{row.symbol}</span>
                      <span className="font-mono">{usd(row.usd)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyLine text={t('pageCommon.noData')} />
              )}
            </div>
            <div className="glass-panel p-4 sm:p-5 space-y-3">
              <p className="section-label">{t('admin.reportPage.byNetwork')}</p>
              {data.breakdown.byNetwork.length ? (
                <ul className="space-y-2">
                  {data.breakdown.byNetwork.map((row) => (
                    <li key={row.name} className="flex justify-between text-sm">
                      <span>{row.name}</span>
                      <span className="font-mono">{usd(row.usd)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyLine text={t('pageCommon.noData')} />
              )}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <div className="glass-panel p-4 sm:p-5 space-y-3">
              <p className="section-label">{t('admin.reportPage.recentInvestments')}</p>
              {data.recentInvestments.length ? (
                <ul className="space-y-3">
                  {data.recentInvestments.map((row) => (
                    <li key={row.id} className="flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">{row.name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          <UserLink user={row.user} /> · {row.kind}
                        </p>
                      </div>
                      <span className="font-mono shrink-0">{usd(row.amountUsd)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyLine text={t('pageCommon.noData')} />
              )}
            </div>
            <div className="glass-panel p-4 sm:p-5 space-y-3">
              <p className="section-label">{t('admin.reportPage.signups')}</p>
              {data.newUsers.length ? (
                <ul className="space-y-2">
                  {data.newUsers.map((user) => (
                    <li key={user.id} className="text-sm">
                      <UserLink user={user} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyLine text={t('admin.reportPage.noSignups')} />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
