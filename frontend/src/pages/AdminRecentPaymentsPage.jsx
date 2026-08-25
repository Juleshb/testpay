import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listAdminPayments, notifyPendingDepositors, notifyPendingDeposit } from '../adminApi';
import { shortenAddress, loadNetworks, getChainName } from '../wallet';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import SegmentedControl from '../components/ui/SegmentedControl';
import { PageLoader } from '../components/ui/Spinner';

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

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'status.all' },
  { value: 'PENDING', labelKey: 'status.pending' },
  { value: 'CONFIRMED', labelKey: 'status.confirmed' },
  { value: 'SWEPT', labelKey: 'status.swept' },
  { value: 'EXPIRED', labelKey: 'status.expired' },
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

export default function AdminRecentPaymentsPage() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [status, setStatus] = useState('all');
  const [showNotify, setShowNotify] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [busyPaymentId, setBusyPaymentId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadNetworks().then(setNetworks).catch(console.error);
  }, []);

  useEffect(() => {
    listAdminPayments()
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      listAdminPayments().then(setPayments).catch(console.error);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - PERIOD_MS[period];
    return payments.filter((p) => {
      if (period !== 'all' && new Date(p.createdAt).getTime() < cutoff) return false;
      if (status !== 'all' && p.status !== status) return false;
      return true;
    });
  }, [payments, period, status]);

  const pendingWithUser = useMemo(
    () => payments.filter((p) => p.status === 'PENDING' && p.userId),
    [payments]
  );

  const pendingUserCount = useMemo(
    () => new Set(pendingWithUser.map((p) => p.userId)).size,
    [pendingWithUser]
  );

  const stats = useMemo(
    () => ({
      total: filtered.length,
      pending: filtered.filter((p) => p.status === 'PENDING').length,
      completed: filtered.filter((p) => p.status === 'CONFIRMED' || p.status === 'SWEPT').length,
      users: new Set(filtered.map((p) => p.userEmail)).size,
    }),
    [filtered]
  );

  const groups = useMemo(() => groupPaymentsByDate(filtered, t), [filtered, t]);

  const handleNotifyAll = async () => {
    setNotifyBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await notifyPendingDepositors(customMessage.trim() || undefined);
      setMessage(
        t('admin.recentPaymentsPage.notifyPendingDone', {
          sent: data.sent,
          users: data.uniqueUsers,
          failed: data.failed,
        })
      );
      setShowNotify(false);
      setCustomMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setNotifyBusy(false);
    }
  };

  const handleNotifyOne = async (paymentId) => {
    setBusyPaymentId(paymentId);
    setError('');
    setMessage('');
    try {
      await notifyPendingDeposit(paymentId);
      setMessage(t('admin.recentPaymentsPage.notifyOneDone'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyPaymentId('');
    }
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.platformPayments')} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('admin.recentPaymentsPage.title')}
        label={t('admin.recentPaymentsPage.label')}
        description={t('admin.recentPaymentsPage.description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              disabled={pendingUserCount === 0}
              onClick={() => {
                setShowNotify(true);
                setCustomMessage(t('admin.recentPaymentsPage.notifyPendingDraft'));
                setError('');
                setMessage('');
              }}
            >
              {t('admin.recentPaymentsPage.notifyPending', {
                users: pendingUserCount,
                payments: pendingWithUser.length,
              })}
            </Button>
            <Link to="/admin">
              <Button variant="ghost" size="md">
                {t('admin.systemDashboard')}
              </Button>
            </Link>
          </div>
        }
      />

      {error && <Alert>{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {showNotify && (
        <section className="glass-panel p-4 sm:p-5 space-y-3">
          <p className="font-semibold text-sm">{t('admin.recentPaymentsPage.notifyPendingTitle')}</p>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('admin.recentPaymentsPage.notifyPendingHint')}
          </p>
          <label className="block">
            <span className="section-label text-[10px] mb-1.5 block">
              {t('admin.recentPaymentsPage.notifyPendingCustom')}
            </span>
            <textarea
              className="w-full rounded-lg px-3 py-2 text-sm font-mono min-h-[100px] resize-y"
              style={{
                background: 'var(--color-surface-700)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={t('admin.recentPaymentsPage.notifyPendingPlaceholder')}
              maxLength={2000}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="md" loading={notifyBusy} onClick={handleNotifyAll}>
              {t('admin.recentPaymentsPage.notifyPendingSend')}
            </Button>
            <Button
              variant="ghost"
              size="md"
              disabled={notifyBusy}
              onClick={() => {
                setShowNotify(false);
                setCustomMessage('');
              }}
            >
              {t('admin.recentPaymentsPage.notifyPendingCancel')}
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="section-label mb-2">{t('pageCommon.period')}</p>
            <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          </div>
          <div>
            <p className="section-label mb-2">{t('pageCommon.status')}</p>
            <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t('admin.recentPaymentsPage.inRange')} value={stats.total} />
          <StatCard label={t('admin.recentPaymentsPage.users')} value={stats.users} color="text-[var(--color-accent)]" />
          <StatCard label={t('admin.pending')} value={stats.pending} color="text-[var(--color-warning)]" />
          <StatCard label={t('status.completed')} value={stats.completed} color="text-[var(--color-success)]" />
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="glass-panel">
          <EmptyState
            title={t('admin.recentPaymentsPage.emptyTitle')}
            description={t('admin.recentPaymentsPage.emptyDescription')}
          />
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.label}>
            <p className="section-label mb-4">{group.label.toLowerCase()}</p>

            <div className="hidden lg:block glass-panel overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b font-mono text-xs uppercase tracking-wider text-left"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <th className="px-4 py-3 font-medium">{t('pageCommon.amount')}</th>
                      <th className="px-4 py-3 font-medium">{t('pageCommon.user')}</th>
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
                        <td className="px-4 py-3.5 font-mono tabular-nums whitespace-nowrap">
                          {p.amount} {p.tokenSymbol}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-xs truncate max-w-[140px]" style={{ color: 'var(--color-text-primary)' }}>
                            {p.userEmail}
                          </p>
                          {p.userName && p.userName !== '—' && (
                            <p className="font-mono text-[10px] truncate max-w-[140px]" style={{ color: 'var(--color-text-muted)' }}>
                              {p.userName}
                            </p>
                          )}
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
                        <td className="px-4 py-3.5 font-mono text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(p.createdAt).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3 justify-end">
                            {p.status === 'PENDING' && p.userId && (
                              <button
                                type="button"
                                className="font-mono text-xs hover:underline disabled:opacity-50"
                                style={{ color: 'var(--color-warning)' }}
                                disabled={busyPaymentId === p.id}
                                onClick={() => handleNotifyOne(p.id)}
                              >
                                {busyPaymentId === p.id
                                  ? '…'
                                  : t('admin.recentPaymentsPage.notifyOne')}
                              </button>
                            )}
                            <Link
                              to={`/pay/${p.id}`}
                              className="font-mono text-xs hover:underline"
                              style={{ color: 'var(--color-accent)' }}
                            >
                              {t('pageCommon.open')}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:hidden space-y-3 mb-6">
              {group.items.map((p) => (
                <div key={p.id} className="glass-panel p-4">
                  <Link
                    to={`/pay/${p.id}`}
                    className="block transition-colors hover:opacity-90"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-mono font-semibold tabular-nums">
                          {p.amount} {p.tokenSymbol}
                        </p>
                        <p className="font-mono text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                          {p.userEmail}
                        </p>
                      </div>
                      <Badge status={p.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {p.networkName || getChainName(p.chainId, networks)} · {shortenAddress(p.depositAddress)}
                      </p>
                      <p className="font-mono text-xs shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(p.createdAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </Link>
                  {p.status === 'PENDING' && p.userId && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        loading={busyPaymentId === p.id}
                        onClick={() => handleNotifyOne(p.id)}
                      >
                        {t('admin.recentPaymentsPage.notifyOne')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
