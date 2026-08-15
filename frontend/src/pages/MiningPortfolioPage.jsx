import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMiningPositions, getMiningIncome } from '../miningApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { LiveMiningCard } from '../components/LiveMiningPanel';

export default function MiningPortfolioPage() {
  const { t } = useTranslation();
  const [positions, setPositions] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      Promise.all([getMiningPositions(), getMiningIncome()])
        .then(([pos, inc]) => {
          setPositions(pos);
          setIncome(inc);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <PageLoader message={t('pageCommon.loading.miningPortfolio')} />;

  const activePositions = positions.filter((pos) => pos.status === 'ACTIVE');
  const otherPositions = positions.filter((pos) => pos.status !== 'ACTIVE');
  const dailyIncomeTotal = activePositions.reduce(
    (sum, pos) => sum + (parseFloat(pos.dailyIncome) || 0),
    0
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('miningPortfolio.title')}
        label={t('miningPortfolio.label')}
        description={t('miningPortfolio.description')}
        actions={
          <Link to="/mining">
            <Button variant="ghost" size="md">
              {t('miningPortfolio.browseMining')}
            </Button>
          </Link>
        }
      />

      {activePositions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label={t('miningPortfolio.dailyIncome')}
            value={`$${dailyIncomeTotal.toFixed(4)}`}
            color="text-[var(--color-success)]"
          />
          <StatCard label={t('miningPortfolio.activeMiners')} value={activePositions.length} />
          <StatCard
            label={t('miningPortfolio.activeAllocated')}
            value={`$${activePositions.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toFixed(2)}`}
          />
        </div>
      )}

      {activePositions.length > 0 && (
        <section>
          <p className="section-label mb-4 inline-flex items-center gap-2">
            <span
              className="mining-live-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--color-success)' }}
            />
            {t('mining.liveMovement')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {activePositions.map((pos) => (
              <LiveMiningCard key={pos.id} position={pos} />
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="section-label mb-4">{t('miningPortfolio.positions')}</p>
        {positions.length === 0 ? (
          <div className="glass-panel">
            <EmptyState
              title={t('miningPortfolio.emptyTitle')}
              description={t('miningPortfolio.emptyDescription')}
              action={
                <Link to="/mining">
                  <Button size="md">{t('miningPortfolio.browseMining')}</Button>
                </Link>
              }
            />
          </div>
        ) : otherPositions.length === 0 && activePositions.length > 0 ? (
          <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('miningPortfolio.activeShownAbove')}
          </p>
        ) : (
          <div className="grid gap-4">
            {(otherPositions.length > 0 ? otherPositions : positions).map((pos) => (
              <article key={pos.id} className="glass-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: pos.option.badgeColor }}
                      />
                      <h3 className="font-semibold">{pos.option.name}</h3>
                      <StatusPill status={pos.status} />
                    </div>
                    <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {t('miningPortfolio.daysLeft', { rate: pos.dailyRate, days: pos.daysLeft })}
                      {' · '}
                      {pos.option.hashRate} · {pos.option.coin}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                      {pos.amount} {pos.tokenSymbol}
                    </p>
                    <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-success)' }}>
                      {t('miningPortfolio.earned', { amount: parseFloat(pos.totalEarned).toFixed(6) })}
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('miningPortfolio.dailyIncome')}</dt>
                    <dd>
                      {pos.dailyIncome} {pos.tokenSymbol}
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('miningPortfolio.started')}</dt>
                    <dd>{new Date(pos.startedAt).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('miningPortfolio.ends')}</dt>
                    <dd>{new Date(pos.endsAt).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('miningPortfolio.lastAccrual')}</dt>
                    <dd>
                      {pos.lastAccruedAt
                        ? new Date(pos.lastAccruedAt).toLocaleDateString()
                        : t('miningPortfolio.pending')}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="section-label mb-4">{t('miningPortfolio.incomeHistory')}</p>
        <div className="glass-panel overflow-hidden">
          {income.length === 0 ? (
            <p className="p-6 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('miningPortfolio.incomeEmpty')}
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
                      <th className="px-4 py-3">{t('miningPortfolio.option')}</th>
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
                        <td className="px-4 py-3 text-xs">{row.optionName}</td>
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
                      <p className="text-sm truncate">{row.optionName}</p>
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
    ACTIVE: t('miningPortfolio.statusActive'),
    COMPLETED: t('miningPortfolio.statusCompleted'),
    CANCELLED: t('miningPortfolio.statusCancelled'),
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
