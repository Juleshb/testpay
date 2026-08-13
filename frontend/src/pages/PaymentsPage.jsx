import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPayments } from '../api';
import { shortenAddress, loadNetworks, getChainName } from '../wallet';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.status === 'PENDING').length,
    confirmed: payments.filter((p) => p.status === 'CONFIRMED' || p.status === 'SWEPT').length,
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.payments')} />;

  return (
    <div>
      <PageHeader
        title={t('payments.title')}
        label={t('payments.label')}
        description={t('payments.description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/payments/recent">
              <Button variant="ghost" size="md">
                {t('payments.recent')}
              </Button>
            </Link>
            <Link to="/payments/new">
              <Button size="md">{t('payments.newPayment')}</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label={t('payments.total')} value={stats.total} />
        <StatCard label={t('payments.pending')} value={stats.pending} color="text-[var(--color-warning)]" />
        <StatCard label={t('payments.completed')} value={stats.confirmed} color="text-[var(--color-success)]" />
      </div>

      <div className="hidden md:block glass-panel overflow-hidden">
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
                <th className="px-4 py-3 font-medium">{t('pageCommon.date')}</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title={t('payments.emptyTitle')}
                      description={t('payments.emptyDescription')}
                      action={
                        <Link to="/payments/new">
                          <Button size="md">{t('payments.createPayment')}</Button>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
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
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link to={`/pay/${p.id}`} className="font-mono text-xs hover:underline" style={{ color: 'var(--color-accent)' }}>
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
        {payments.length === 0 ? (
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
          payments.map((p) => (
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
              <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {shortenAddress(p.depositAddress)}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
