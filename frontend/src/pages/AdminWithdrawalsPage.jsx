import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getAdminWithdrawSettings,
  updateAdminWithdrawSettings,
  listAdminWithdrawals,
  cancelAdminWithdrawal,
  retryAdminWithdrawal,
  processAdminWithdrawal,
  processAdminWithdrawQueue,
} from '../adminApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { Label, Input } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import SegmentedControl from '../components/ui/SegmentedControl';
import TxHashDisplay from '../components/TxHashDisplay';

const EMPTY_FORM = {
  minWithdrawUsd: '5',
  maxWithdrawUsd: '50000',
  maxWithdrawUsdPerDay: '50000',
  maxWithdrawalsPerDay: '5',
  feePercent: '0',
  feeFlatUsd: '0',
};

const STATUS_FILTERS = [
  { value: 'all', labelKey: 'admin.withdrawalsPage.filterAll' },
  { value: 'PENDING', labelKey: 'admin.withdrawalsPage.filterPending' },
  { value: 'PROCESSING', labelKey: 'admin.withdrawalsPage.filterProcessing' },
  { value: 'COMPLETED', labelKey: 'admin.withdrawalsPage.filterCompleted' },
  { value: 'FAILED', labelKey: 'admin.withdrawalsPage.filterFailed' },
  { value: 'CANCELLED', labelKey: 'admin.withdrawalsPage.filterCancelled' },
];

export default function AdminWithdrawalsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [queueBusy, setQueueBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stats, setStats] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});
  const [withdrawals, setWithdrawals] = useState([]);
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSettings = useCallback(async () => {
    const data = await getAdminWithdrawSettings();
    setForm({
      minWithdrawUsd: data.settings.minWithdrawUsd,
      maxWithdrawUsd: data.settings.maxWithdrawUsd,
      maxWithdrawUsdPerDay: data.settings.maxWithdrawUsdPerDay,
      maxWithdrawalsPerDay: String(data.settings.maxWithdrawalsPerDay),
      feePercent: data.settings.feePercent,
      feeFlatUsd: data.settings.feeFlatUsd,
    });
    setStats(data.stats);
    setStatusCounts(data.stats?.statusCounts || {});
  }, []);

  const loadList = useCallback(async () => {
    const data = await listAdminWithdrawals({ status, limit: 150 });
    setWithdrawals(data.withdrawals || []);
    setStatusCounts(data.statusCounts || {});
  }, [status]);

  const load = useCallback(async () => {
    try {
      await Promise.all([loadSettings(), loadList()]);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadSettings, loadList]);

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(() => {
      loadList().catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [load, loadList]);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const data = await updateAdminWithdrawSettings({
        minWithdrawUsd: form.minWithdrawUsd,
        maxWithdrawUsd: form.maxWithdrawUsd,
        maxWithdrawUsdPerDay: form.maxWithdrawUsdPerDay,
        maxWithdrawalsPerDay: parseInt(form.maxWithdrawalsPerDay, 10),
        feePercent: form.feePercent,
        feeFlatUsd: form.feeFlatUsd,
      });
      setForm({
        minWithdrawUsd: data.settings.minWithdrawUsd,
        maxWithdrawUsd: data.settings.maxWithdrawUsd,
        maxWithdrawUsdPerDay: data.settings.maxWithdrawUsdPerDay,
        maxWithdrawalsPerDay: String(data.settings.maxWithdrawalsPerDay),
        feePercent: data.settings.feePercent,
        feeFlatUsd: data.settings.feeFlatUsd,
      });
      setMessage(t('admin.withdrawalsPage.saved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id, action) => {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      if (action === 'cancel') {
        await cancelAdminWithdrawal(id, 'Cancelled by admin');
        setMessage(t('admin.withdrawalsPage.cancelled'));
      } else if (action === 'retry') {
        await retryAdminWithdrawal(id);
        setMessage(t('admin.withdrawalsPage.retried'));
      } else if (action === 'process') {
        await processAdminWithdrawal(id);
        setMessage(t('admin.withdrawalsPage.processed'));
      }
      await loadList();
      await loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const handleProcessQueue = async () => {
    setQueueBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await processAdminWithdrawQueue();
      const ok = (data.results || []).filter((r) => r.success).length;
      const fail = (data.results || []).length - ok;
      setMessage(t('admin.withdrawalsPage.queueDone', { ok, fail }));
      await loadList();
      await loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setQueueBusy(false);
    }
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.withdrawSettings')} />;

  const pendingCount = statusCounts.PENDING || 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={t('admin.withdrawalsPage.title')}
        label={t('admin.withdrawalsPage.label')}
        description={t('admin.withdrawalsPage.description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              loading={queueBusy}
              disabled={pendingCount === 0}
              onClick={handleProcessQueue}
            >
              {t('admin.withdrawalsPage.processQueue', { count: pendingCount })}
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

      {stats && (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label={t('admin.withdrawalsPage.total')} value={stats.total ?? 0} />
          <StatCard
            label={t('admin.withdrawalsPage.queued')}
            value={statusCounts.PENDING || 0}
            color="text-[var(--color-warning)]"
          />
          <StatCard
            label={t('admin.withdrawalsPage.completed')}
            value={statusCounts.COMPLETED || stats.completedCount || 0}
            color="text-[var(--color-success)]"
          />
          <StatCard
            label={t('admin.withdrawalsPage.failed')}
            value={statusCounts.FAILED || 0}
            color="text-[var(--color-danger)]"
          />
          <StatCard
            label={t('admin.withdrawalsPage.totalFees')}
            value={`$${stats.totalFeesUsd}`}
            color="text-[var(--color-accent)]"
          />
          <StatCard
            label={t('admin.withdrawalsPage.totalVolume')}
            value={`$${stats.totalVolumeUsd}`}
            color="text-[var(--color-success)]"
          />
        </section>
      )}

      <section className="glass-panel p-5 sm:p-6">
        <p className="section-label mb-4">{t('admin.withdrawalsPage.settings')}</p>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minWithdrawUsd">{t('admin.withdrawalsPage.minAmount')}</Label>
              <Input
                id="minWithdrawUsd"
                type="number"
                min="0.01"
                step="0.01"
                value={form.minWithdrawUsd}
                onChange={setField('minWithdrawUsd')}
                required
              />
            </div>
            <div>
              <Label htmlFor="maxWithdrawUsd">{t('admin.withdrawalsPage.maxAmount')}</Label>
              <Input
                id="maxWithdrawUsd"
                type="number"
                min="0.01"
                step="0.01"
                value={form.maxWithdrawUsd}
                onChange={setField('maxWithdrawUsd')}
                required
              />
            </div>
            <div>
              <Label htmlFor="maxWithdrawUsdPerDay">{t('admin.withdrawalsPage.maxPerDay')}</Label>
              <Input
                id="maxWithdrawUsdPerDay"
                type="number"
                min="0.01"
                step="0.01"
                value={form.maxWithdrawUsdPerDay}
                onChange={setField('maxWithdrawUsdPerDay')}
                required
              />
              <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {t('admin.withdrawalsPage.maxPerDayHint')}
              </p>
            </div>
            <div>
              <Label htmlFor="maxWithdrawalsPerDay">{t('admin.withdrawalsPage.maxTimesPerDay')}</Label>
              <Input
                id="maxWithdrawalsPerDay"
                type="number"
                min="1"
                max="100"
                step="1"
                value={form.maxWithdrawalsPerDay}
                onChange={setField('maxWithdrawalsPerDay')}
                required
              />
              <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {t('admin.withdrawalsPage.maxTimesHint')}
              </p>
            </div>
            <div>
              <Label htmlFor="feePercent">{t('admin.withdrawalsPage.feePercent')}</Label>
              <Input
                id="feePercent"
                type="number"
                min="0"
                max="50"
                step="0.01"
                value={form.feePercent}
                onChange={setField('feePercent')}
                required
              />
            </div>
            <div>
              <Label htmlFor="feeFlatUsd">{t('admin.withdrawalsPage.feeFlat')}</Label>
              <Input
                id="feeFlatUsd"
                type="number"
                min="0"
                max="1000"
                step="0.01"
                value={form.feeFlatUsd}
                onChange={setField('feeFlatUsd')}
                required
              />
              <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {t('admin.withdrawalsPage.feeHint')}
              </p>
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t('admin.withdrawalsPage.saving') : t('admin.withdrawalsPage.save')}
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-label mb-2">{t('admin.withdrawalsPage.queue')}</p>
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.withdrawalsPage.queueHint')}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <SegmentedControl
            options={STATUS_FILTERS}
            value={status}
            onChange={setStatus}
            className="min-w-[40rem]"
          />
        </div>

        {withdrawals.length === 0 ? (
          <div className="glass-panel">
            <EmptyState title={t('admin.withdrawalsPage.emptyRecent')} />
          </div>
        ) : (
          <>
            <div className="hidden lg:block glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b font-mono text-xs uppercase tracking-wider text-left"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <th className="px-4 py-3">{t('pageCommon.date')}</th>
                      <th className="px-4 py-3">{t('admin.withdrawalsPage.user')}</th>
                      <th className="px-4 py-3">{t('pageCommon.amount')}</th>
                      <th className="px-4 py-3">{t('admin.withdrawalsPage.fee')}</th>
                      <th className="px-4 py-3">{t('admin.withdrawalsPage.net')}</th>
                      <th className="px-4 py-3">{t('admin.withdrawalsPage.status')}</th>
                      <th className="px-4 py-3">{t('admin.withdrawalsPage.tx')}</th>
                      <th className="px-4 py-3">{t('admin.withdrawalsPage.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr
                        key={w.id}
                        className="border-b align-top"
                        style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                      >
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                          {new Date(w.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/users/${w.userId}`}
                            className="font-mono text-xs hover:underline"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {w.userLabel}
                          </Link>
                          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {w.networkName}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">${w.amountUsd}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                          ${w.feeUsd || '0.00'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          ${w.netAmountUsd || w.amountUsd} → {w.tokenAmount} {w.tokenSymbol}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs">{w.status}</p>
                          {w.failureReason && (
                            <p className="font-mono text-[10px] mt-1 max-w-[12rem]" style={{ color: 'var(--color-danger)' }}>
                              {w.failureReason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[16rem]">
                          {w.txHash ? (
                            <TxHashDisplay txHash={w.txHash} explorer={w.explorer} compact />
                          ) : (
                            <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ActionButtons
                            w={w}
                            busy={busyId === w.id}
                            onAction={runAction}
                            t={t}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:hidden space-y-3">
              {withdrawals.map((w) => (
                <article key={w.id} className="glass-panel p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">${w.amountUsd}</p>
                      <Link
                        to={`/admin/users/${w.userId}`}
                        className="font-mono text-xs hover:underline"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {w.userLabel}
                      </Link>
                    </div>
                    <span className="font-mono text-[10px]">{w.status}</span>
                  </div>
                  <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Fee ${w.feeUsd || '0.00'} · net ${w.netAmountUsd || w.amountUsd} {w.tokenSymbol}
                  </p>
                  {w.txHash && <TxHashDisplay txHash={w.txHash} explorer={w.explorer} />}
                  <ActionButtons w={w} busy={busyId === w.id} onAction={runAction} t={t} />
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ActionButtons({ w, busy, onAction, t }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {w.status === 'PENDING' && (
        <>
          <Button size="sm" variant="primary" loading={busy} onClick={() => onAction(w.id, 'process')}>
            {t('admin.withdrawalsPage.sendNow')}
          </Button>
          <Button size="sm" variant="ghost" loading={busy} onClick={() => onAction(w.id, 'cancel')}>
            {t('admin.withdrawalsPage.cancel')}
          </Button>
        </>
      )}
      {(w.status === 'FAILED' || w.status === 'CANCELLED') && (
        <Button size="sm" variant="primary" loading={busy} onClick={() => onAction(w.id, 'retry')}>
          {t('admin.withdrawalsPage.retry')}
        </Button>
      )}
      {w.status === 'PROCESSING' && (
        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          —
        </span>
      )}
    </div>
  );
}
