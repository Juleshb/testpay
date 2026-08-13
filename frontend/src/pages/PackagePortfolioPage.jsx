import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPackageInvestments, getPackageIncome } from '../packagesApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';

export default function PackagePortfolioPage() {
  const { t } = useTranslation();
  const [investments, setInvestments] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      Promise.all([getPackageInvestments(), getPackageIncome()])
        .then(([inv, inc]) => {
          setInvestments(inv);
          setIncome(inc);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <PageLoader message={t('pageCommon.loading.portfolio')} />;

  const activeInvestments = investments.filter((inv) => inv.status === 'ACTIVE');
  const dailyIncomeTotal = activeInvestments.reduce(
    (sum, inv) => sum + (parseFloat(inv.dailyIncome) || 0),
    0
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('portfolio.title')}
        label={t('portfolio.label')}
        description={t('portfolio.description')}
        actions={
          <Link to="/packages">
            <Button variant="ghost" size="md">
              {t('portfolio.browsePackages')}
            </Button>
          </Link>
        }
      />

      {activeInvestments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label={t('portfolio.dailyIncome')}
            value={`$${dailyIncomeTotal.toFixed(4)}`}
            color="text-[var(--color-success)]"
          />
          <StatCard label={t('portfolio.activePackages')} value={activeInvestments.length} />
          <StatCard
            label={t('portfolio.activeInvested')}
            value={`$${activeInvestments.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toFixed(2)}`}
          />
        </div>
      )}

      <section>
        <p className="section-label mb-4">{t('portfolio.investments')}</p>
        {investments.length === 0 ? (
          <div className="glass-panel">
            <EmptyState
              title={t('portfolio.emptyTitle')}
              description={t('portfolio.emptyDescription')}
              action={
                <Link to="/packages">
                  <Button size="md">{t('portfolio.browsePackages')}</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4">
            {investments.map((inv) => (
              <article key={inv.id} className="glass-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: inv.package.badgeColor }}
                      />
                      <h3 className="font-semibold">{inv.package.name}</h3>
                      <StatusPill status={inv.status} />
                    </div>
                    <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {t('portfolio.daysLeft', { rate: inv.dailyRate, days: inv.daysLeft })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                      {inv.amount} {inv.tokenSymbol}
                    </p>
                    <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-success)' }}>
                      {t('portfolio.earned', { amount: parseFloat(inv.totalEarned).toFixed(6) })}
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('portfolio.dailyIncome')}</dt>
                    <dd>{inv.dailyIncome} {inv.tokenSymbol}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('portfolio.started')}</dt>
                    <dd>{new Date(inv.startedAt).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('portfolio.ends')}</dt>
                    <dd>{new Date(inv.endsAt).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('portfolio.lastAccrual')}</dt>
                    <dd>
                      {inv.lastAccruedAt
                        ? new Date(inv.lastAccruedAt).toLocaleDateString()
                        : t('portfolio.pending')}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="section-label mb-4">{t('portfolio.incomeHistory')}</p>
        <div className="glass-panel overflow-hidden">
          {income.length === 0 ? (
            <p className="p-6 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('portfolio.incomeEmpty')}
            </p>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b font-mono text-xs uppercase tracking-wider text-left"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <th className="px-4 py-3">{t('pageCommon.date')}</th>
                      <th className="px-4 py-3">{t('portfolio.package')}</th>
                      <th className="px-4 py-3">{t('pageCommon.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {income.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b"
                        style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                      >
                        <td className="px-4 py-3 font-mono text-xs tabular-nums">
                          {new Date(row.accrualDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs">{row.packageName}</td>
                        <td className="px-4 py-3 font-mono tabular-nums" style={{ color: 'var(--color-success)' }}>
                          +{parseFloat(row.amount).toFixed(6)} {row.tokenSymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {income.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{row.packageName}</p>
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(row.accrualDate).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-mono text-sm shrink-0 tabular-nums" style={{ color: 'var(--color-success)' }}>
                      +{parseFloat(row.amount).toFixed(6)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }) {
  const { t } = useTranslation();

  const colors = {
    ACTIVE: 'var(--color-success)',
    COMPLETED: 'var(--color-accent)',
    CANCELLED: 'var(--color-danger)',
  };

  const labels = {
    ACTIVE: t('portfolio.statusActive'),
    COMPLETED: t('portfolio.statusCompleted'),
    CANCELLED: t('portfolio.statusCancelled'),
  };

  const color = colors[status] || 'var(--color-text-muted)';
  const label = labels[status] || status.toLowerCase();

  return (
    <span
      className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
