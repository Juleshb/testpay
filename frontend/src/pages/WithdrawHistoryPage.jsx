import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getWithdrawHistory } from '../withdrawalsApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import { PageLoader } from '../components/ui/Spinner';
import TxHashDisplay from '../components/TxHashDisplay';

const STATUS_FILTERS = [
  { value: 'all', labelKey: 'withdrawHistory.filterAll' },
  { value: 'PENDING', labelKey: 'withdrawHistory.filterPending' },
  { value: 'PROCESSING', labelKey: 'withdrawHistory.filterProcessing' },
  { value: 'COMPLETED', labelKey: 'withdrawHistory.filterCompleted' },
  { value: 'FAILED', labelKey: 'withdrawHistory.filterFailed' },
];

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const colors = {
    PENDING: 'var(--color-warning)',
    PROCESSING: 'var(--color-info)',
    COMPLETED: 'var(--color-success)',
    FAILED: 'var(--color-danger)',
    CANCELLED: 'var(--color-danger)',
  };
  const color = colors[status] || 'var(--color-text-muted)';
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {t(`status.${status.toLowerCase()}`)}
    </span>
  );
}

function formatTime(date) {
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WithdrawHistoryPage() {
  const { t } = useTranslation();
  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await getWithdrawHistory(500, { status });
      setWithdrawals(data.withdrawals || []);
      setTotal(data.total ?? data.withdrawals?.length ?? 0);
    } catch (err) {
      setError(err.message || t('withdrawHistory.loadError'));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const stats = useMemo(() => {
    const all = withdrawals;
    // When filtered, fetch only filtered rows — stats from current list for filtered view
    // For accurate all-status counts, use total when status=all and derive from list
    return {
      shown: all.length,
      total,
      completed: all.filter((w) => w.status === 'COMPLETED').length,
      pending: all.filter((w) => w.status === 'PENDING' || w.status === 'PROCESSING').length,
      failed: all.filter((w) => w.status === 'FAILED' || w.status === 'CANCELLED').length,
      volume: all
        .filter((w) => w.status === 'COMPLETED')
        .reduce((sum, w) => sum + (parseFloat(w.amountUsd) || 0), 0)
        .toFixed(2),
    };
  }, [withdrawals, total]);

  if (loading && withdrawals.length === 0) {
    return <PageLoader message={t('pageCommon.loading.withdraw')} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('withdrawHistory.title')}
        label={t('withdrawHistory.label')}
        description={t('withdrawHistory.description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/withdraw">
              <Button variant="primary" size="md">
                {t('withdrawHistory.newWithdraw')}
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="md">
                {t('withdraw.dashboard')}
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <p className="font-mono text-sm" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t('withdrawHistory.total')} value={stats.total} />
        <StatCard
          label={t('withdrawHistory.completed')}
          value={stats.completed}
          color="text-[var(--color-success)]"
        />
        <StatCard
          label={t('withdrawHistory.inProgress')}
          value={stats.pending}
          color="text-[var(--color-warning)]"
        />
        <StatCard
          label={t('withdrawHistory.completedVolume')}
          value={`$${stats.volume}`}
          color="text-[var(--color-accent)]"
        />
      </section>

      <section className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <SegmentedControl
            options={STATUS_FILTERS}
            value={status}
            onChange={setStatus}
            className="min-w-[28rem]"
          />
        </div>
        <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t('withdrawHistory.showing', { shown: stats.shown, total: stats.total })}
        </p>

        {withdrawals.length === 0 ? (
          <div className="glass-panel">
            <EmptyState
              title={t('withdraw.noWithdrawals')}
              description={
                status === 'all'
                  ? t('withdraw.noWithdrawalsHint')
                  : t('withdrawHistory.emptyFiltered')
              }
              action={
                <Link to="/withdraw">
                  <Button variant="primary" size="md">
                    {t('withdrawHistory.newWithdraw')}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b font-mono text-xs uppercase tracking-wider text-left"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <th className="px-4 py-3">{t('pageCommon.date')}</th>
                      <th className="px-4 py-3">{t('withdrawHistory.amount')}</th>
                      <th className="px-4 py-3">{t('withdrawHistory.network')}</th>
                      <th className="px-4 py-3">{t('withdrawHistory.status')}</th>
                      <th className="px-4 py-3">{t('withdrawHistory.tx')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => {
                      return (
                        <tr
                          key={w.id}
                          className="border-b align-top"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)',
                          }}
                        >
                          <td className="px-4 py-3.5 font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatTime(w.createdAt)}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold tabular-nums">${w.amountUsd}</p>
                            <p className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                              → {w.tokenAmount} {w.tokenSymbol}
                            </p>
                            {parseFloat(w.feeUsd || '0') > 0 && (
                              <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-accent)' }}>
                                {t('withdraw.feeLine', {
                                  fee: w.feeUsd,
                                  net: w.netAmountUsd || w.amountUsd,
                                })}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">{w.networkName}</td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={w.status} />
                            {w.failureReason && (w.status === 'FAILED' || w.status === 'CANCELLED') && (
                              <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-danger)' }}>
                                {w.failureReason}
                                {w.status === 'FAILED' && t('withdraw.balanceRefunded')}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 max-w-[18rem]">
                            {w.txHash ? (
                              <TxHashDisplay
                                txHash={w.txHash}
                                explorer={w.explorer}
                                compact
                                showExplorerLink={false}
                              />
                            ) : (
                              <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                {w.status === 'PENDING' || w.status === 'PROCESSING'
                                  ? t('withdraw.inQueue')
                                  : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden space-y-3">
              {withdrawals.map((w) => {
                return (
                  <article
                    key={w.id}
                    className="glass-panel p-4 border space-y-2"
                    style={{ borderColor: 'var(--color-glass-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          ${w.amountUsd} → {w.tokenAmount} {w.tokenSymbol}
                        </p>
                        <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {w.networkName} · {formatTime(w.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={w.status} />
                    </div>
                    {w.txHash ? (
                      <TxHashDisplay
                        txHash={w.txHash}
                        explorer={w.explorer}
                        showExplorerLink={false}
                      />
                    ) : (
                      <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {w.status === 'PENDING' || w.status === 'PROCESSING'
                          ? t('withdraw.inQueue')
                          : '—'}
                      </p>
                    )}
                    {w.failureReason && (w.status === 'FAILED' || w.status === 'CANCELLED') && (
                      <p className="font-mono text-xs" style={{ color: 'var(--color-danger)' }}>
                        {w.failureReason}
                        {w.status === 'FAILED' && t('withdraw.balanceRefunded')}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
