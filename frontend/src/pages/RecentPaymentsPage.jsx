import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPayments } from '../api';
import { shortenAddress, loadNetworks, getChainName } from '../wallet';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import { PageLoader } from '../components/ui/Spinner';
import { USER_STATUS_OPTIONS, matchesStatusFilter } from '../constants/status';

const PERIOD_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  all: Infinity,
};

const PERIOD_OPTIONS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', labelKey: 'status.all' },
];

function dateGroupLabel(iso, translate) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  if (d >= startToday) return translate('pageCommon.today');
  if (d >= startYesterday) return translate('pageCommon.yesterday');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function groupPaymentsByDate(payments, translate) {
  const groups = [];
  const map = new Map();

  for (const p of payments) {
    const label = dateGroupLabel(p.createdAt, translate);
    if (!map.has(label)) {
      const entry = { label, items: [] };
      map.set(label, entry);
      groups.push(entry);
    }
    map.get(label).items.push(p);
  }

  return groups;
}

export default function RecentPaymentsPage() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    loadNetworks().then(setNetworks).catch(console.error);
  }, []);

  useEffect(() => {
    listPayments()
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      listPayments().then(setPayments).catch(console.error);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - PERIOD_MS[period];
    return payments.filter((p) => {
      if (period !== 'all' && new Date(p.createdAt).getTime() < cutoff) return false;
      if (status !== 'all' && !matchesStatusFilter(p.status, status, false)) return false;
      return true;
    });
  }, [payments, period, status]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      pending: filtered.filter((p) => p.status === 'PENDING').length,
      completed: filtered.filter((p) => p.status === 'CONFIRMED' || p.status === 'SWEPT').length,
    }),
    [filtered]
  );

  const groups = useMemo(() => groupPaymentsByDate(filtered, t), [filtered, t]);

  if (loading) return <PageLoader message={t('pageCommon.loading.recentPayments')} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${t('payments.recent')} ${t('payments.title')}`}
        label={t('payments.recent')}
        description={t('payments.description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/payments">
              <Button variant="ghost" size="md">
                {t('payments.title')}
              </Button>
            </Link>
            <Link to="/payments/new">
              <Button size="md">{t('payments.newPayment')}</Button>
            </Link>
          </div>
        }
      />

      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="section-label mb-2">{t('pageCommon.period')}</p>
            <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          </div>
          <div>
            <p className="section-label mb-2">{t('pageCommon.status')}</p>
            <SegmentedControl options={USER_STATUS_OPTIONS} value={status} onChange={setStatus} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label={t('payments.total')} value={stats.total} />
          <StatCard label={t('payments.pending')} value={stats.pending} color="text-[var(--color-warning)]" />
          <StatCard label={t('payments.completed')} value={stats.completed} color="text-[var(--color-success)]" />
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="glass-panel">
          <EmptyState
            title={t('payments.emptyTitle')}
            description={t('payments.emptyDescription')}
            action={
              <Link to="/payments/new">
                <Button size="md">{t('payments.createPayment')}</Button>
              </Link>
            }
          />
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.label}>
            <p className="section-label mb-4">{group.label.toLowerCase()}</p>

            <div className="hidden md:block glass-panel overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b font-mono text-xs uppercase tracking-wider text-left"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <th className="px-4 py-3 font-medium">{t('pageCommon.amount')}</th>
                      <th className="px-4 py-3 font-medium">{t('pageCommon.network')}</th>
                      <th className="px-4 py-3 font-medium">{t('pageCommon.address')}</th>
                      <th className="px-4 py-3 font-medium">{t('pageCommon.status')}</th>
                      <th className="px-4 py-3 font-medium">{t('pageCommon.time')}</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b hover:bg-white/[0.02] transition-colors"
                        style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                      >
                        <td className="px-4 py-3.5 font-mono tabular-nums">
                          {p.amount} {p.tokenSymbol}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {p.networkName || getChainName(p.chainId, networks)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {shortenAddress(p.depositAddress)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge status={p.status} />
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(p.createdAt).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/pay/${p.id}`}
                            className="font-mono text-xs hover:underline"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {t('pageCommon.open')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden space-y-3 mb-6">
              {group.items.map((p) => (
                <Link
                  key={p.id}
                  to={`/pay/${p.id}`}
                  className="block glass-panel p-4 transition-colors hover:border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-mono font-semibold tabular-nums">
                        {p.amount} {p.tokenSymbol}
                      </p>
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {p.networkName || getChainName(p.chainId, networks)}
                      </p>
                    </div>
                    <Badge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {shortenAddress(p.depositAddress)}
                    </p>
                    <p className="font-mono text-xs shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(p.createdAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
