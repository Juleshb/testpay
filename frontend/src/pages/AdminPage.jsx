import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAdminDashboard, openAdminTreasuryStream, triggerSweep, formatUptime } from '../adminApi';
import { shortenAddress } from '../wallet';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';
import { TokenIcon, NetworkIcon } from '../components/CryptoIcon';
import TxHashDisplay from '../components/TxHashDisplay';

const QUICK_LINKS = [
  { to: '/admin/reports', labelKey: 'admin.hubReports' },
  { to: '/admin/users', labelKey: 'admin.hubUsers' },
  { to: '/admin/conversations', labelKey: 'admin.hubConversations' },
  { to: '/admin/payments/recent', labelKey: 'admin.hubPayments' },
  { to: '/admin/withdrawals', labelKey: 'admin.hubWithdraw' },
  { to: '/admin/packages', labelKey: 'admin.hubPackages' },
  { to: '/admin/mining', labelKey: 'admin.hubMining' },
  { to: '/admin/referrals', labelKey: 'admin.hubReferrals' },
];

export default function AdminPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [treasury, setTreasury] = useState(null);
  const [treasuryLoading, setTreasuryLoading] = useState(true);
  const [treasuryError, setTreasuryError] = useState('');
  const [treasuryLive, setTreasuryLive] = useState(false);
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [showZeroTokens, setShowZeroTokens] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');
  const [streamKey, setStreamKey] = useState(0);

  const applyTreasuryPayload = (payload) => {
    if (payload?.error && !payload.balances && !payload.activity) {
      setTreasuryError(payload.error);
      setActivityError(payload.error);
      setTreasuryLive(false);
      return;
    }
    if (payload.balances) {
      setTreasury(payload.balances);
      setTreasuryLoading(false);
      setTreasuryError('');
    }
    if (payload.activity) {
      setActivity(payload.activity);
      setActivityLoading(false);
      setActivityError('');
    }
    setTreasuryLive(Boolean(payload.live));
  };

  const load = async () => {
    try {
      setData(await getAdminDashboard());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTreasuryLoading(true);
    setActivityLoading(true);
    let reconnectTimer = null;

    const stop = openAdminTreasuryStream({
      onOpen: () => setTreasuryLive(true),
      onData: (payload) => applyTreasuryPayload(payload),
      onError: (err) => {
        setTreasuryLive(false);
        setTreasuryError(err.message || t('admin.treasuryStreamError'));
        setActivityError(err.message || t('admin.treasuryStreamError'));
        setTreasuryLoading(false);
        setActivityLoading(false);
        reconnectTimer = setTimeout(() => setStreamKey((k) => k + 1), 4000);
      },
    });

    return () => {
      stop();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [streamKey, t]);

  const handleSweep = async () => {
    setSweeping(true);
    setMessage('');
    try {
      const result = await triggerSweep();
      const ok = result.swept.filter((r) => r.success).length;
      setMessage(t('admin.sweepComplete', { count: ok }));
      await load();
      setStreamKey((k) => k + 1);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSweeping(false);
    }
  };

  const copyTreasury = async () => {
    if (!treasury?.address && !data?.system?.treasuryAddress) return;
    try {
      await navigator.clipboard.writeText(treasury?.address || data.system.treasuryAddress);
      setCopied('treasury');
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* ignore */
    }
  };

  const fundedNetworks = useMemo(() => {
    if (!treasury?.networks) return [];
    return treasury.networks
      .map((network) => {
        const tokens = showZeroTokens
          ? network.tokens
          : network.tokens.filter((tok) => parseFloat(tok.balance) > 0 || tok.error);
        return { ...network, tokens };
      })
      .filter((n) => n.tokens.length > 0);
  }, [treasury, showZeroTokens]);

  const filteredActivity = useMemo(() => {
    const events = activity?.events || [];
    if (activityFilter === 'in') return events.filter((e) => e.kind === 'IN');
    if (activityFilter === 'out') return events.filter((e) => e.kind === 'OUT');
    return events;
  }, [activity, activityFilter]);

  if (loading || !data) return <PageLoader message={t('pageCommon.loading.dashboard')} />;

  const { overview, volume, system, recentPayments, users, modules, systemBalance } = data;
  const treasuryAddress = treasury?.address || system.treasuryAddress;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title={t('admin.title')}
        label={t('admin.label')}
        description={t('admin.description', { uptime: formatUptime(system.uptimeSeconds) })}
        actions={
          <Button size="md" onClick={handleSweep} loading={sweeping} disabled={overview.confirmed === 0}>
            {t('admin.sweepConfirmed', { count: overview.confirmed })}
          </Button>
        }
      />

      {message && <Alert variant="warning">{message}</Alert>}

      <section>
        <h2 className="section-label mb-3">{t('admin.systemBalance')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label={t('admin.systemAvailable')}
            value={`$${systemBalance?.availableUsd ?? '0.00'}`}
            hint={t('admin.systemBalanceHint')}
            color="text-[var(--color-accent)]"
          />
          <StatCard
            label={t('admin.systemDeposited')}
            value={`$${systemBalance?.depositedUsd ?? volume.confirmedUsd ?? '0.00'}`}
          />
          <StatCard
            label={t('admin.systemFeesIncome')}
            value={`$${systemBalance?.feesIncomeUsd ?? modules.withdrawals.totalFeesUsd ?? '0.00'}`}
            color="text-[var(--color-success)]"
          />
        </div>
      </section>

      {/* 1. Snapshot */}
      <section>
        <h2 className="section-label mb-3">{t('admin.reportSnapshot')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label={t('admin.users')} value={overview.users} />
          <StatCard
            label={t('admin.pendingDeposits')}
            value={overview.pending}
            color="text-[var(--color-warning)]"
          />
          <StatCard
            label={t('admin.withdrawQueue')}
            value={modules.withdrawals.pending}
            color="text-[var(--color-warning)]"
          />
          <StatCard
            label={t('admin.treasuryTotal')}
            value={`$${treasury?.totalUsd ?? '—'}`}
            color="text-[var(--color-accent)]"
          />
        </div>
        <div
          className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 rounded-xl border px-4 py-3 font-mono text-xs"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
        >
          <MiniStat label={t('admin.today')} value={overview.paymentsToday} />
          <MiniStat label={t('admin.toSweep')} value={overview.confirmed} accent />
          <MiniStat label={t('admin.confirmedUsd')} value={`$${volume.confirmedUsd || '0.00'}`} />
          <MiniStat label={t('admin.successRate')} value={`${overview.successRate}%`} />
        </div>
      </section>

      {/* 2. Quick links */}
      <section>
        <h2 className="section-label mb-3">{t('admin.reportManage')}</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="font-mono text-xs px-3 py-2 rounded-lg border transition-colors hover:border-[color-mix(in_srgb,var(--color-accent)_45%,transparent)]"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Treasury */}
      <section className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-glass-border)' }}>
        <div
          className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
        >
          <div className="min-w-0">
            <h2 className="section-label mb-1">{t('admin.treasuryBalances')}</h2>
            <p className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.treasuryBalancesHint')}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="font-mono text-[11px] break-all" style={{ color: 'var(--color-accent)' }}>
                {shortenAddress(treasuryAddress)}
              </p>
              <button
                type="button"
                onClick={copyTreasury}
                className="font-mono text-[10px] hover:underline"
                style={{ color: 'var(--color-accent)' }}
              >
                {copied === 'treasury' ? t('admin.copied') : t('admin.copy')}
              </button>
              {treasury?.checkedAt && (
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  · {t('admin.treasuryCheckedAt', { time: new Date(treasury.checkedAt).toLocaleTimeString() })}
                </span>
              )}
              <span
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider"
                style={{ color: treasuryLive ? 'var(--color-success)' : 'var(--color-text-muted)' }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: treasuryLive ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                />
                {treasuryLive ? t('admin.treasuryLive') : t('admin.treasuryOffline')}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowZeroTokens((v) => !v)}>
              {showZeroTokens ? t('admin.treasuryHideZeros') : t('admin.treasuryShowZeros')}
            </Button>
            <Button size="sm" variant="primary" loading={treasuryLoading} onClick={() => setStreamKey((k) => k + 1)}>
              {treasuryLoading ? t('admin.treasuryRefreshing') : t('admin.treasuryRefresh')}
            </Button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4" style={{ background: 'var(--color-surface-800)' }}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {t('admin.treasuryTotal')}
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums mt-1" style={{ color: 'var(--color-accent)' }}>
                ${treasury?.totalUsd ?? '—'}
              </p>
            </div>
          </div>

          {treasuryError && <Alert>{treasuryError}</Alert>}

          {treasuryLoading && !treasury ? (
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.treasuryRefreshing')}
            </p>
          ) : fundedNetworks.length === 0 ? (
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.treasuryEmpty')}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {fundedNetworks.map((network) => (
                <div
                  key={network.chainId}
                  className="rounded-xl border p-3"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <NetworkIcon chainId={network.chainId} name={network.networkName} size={24} />
                      <p className="font-semibold text-sm truncate">{network.networkName}</p>
                    </div>
                    <p className="font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                      ${network.networkUsd}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {network.tokens.map((tok) => (
                      <li key={`${network.chainId}-${tok.symbol}`} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <TokenIcon symbol={tok.symbol} size={18} />
                          <span className="font-mono text-xs font-semibold">{tok.symbol}</span>
                        </div>
                        <div className="text-right font-mono text-xs tabular-nums">
                          <p>
                            {tok.balance} {tok.symbol}
                          </p>
                          <p style={{ color: 'var(--color-text-muted)' }}>
                            {tok.availableUsd != null ? `$${tok.availableUsd}` : tok.error ? t('admin.treasuryError') : '—'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3b. Treasury activity */}
      <section className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-glass-border)' }}>
        <div
          className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
        >
          <div>
            <h2 className="section-label mb-1">{t('admin.treasuryActivity')}</h2>
            <p className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.treasuryActivityHint')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'all', label: t('admin.treasuryFilterAll') },
              { value: 'in', label: t('admin.treasuryFilterIn') },
              { value: 'out', label: t('admin.treasuryFilterOut') },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActivityFilter(opt.value)}
                className="font-mono text-[11px] px-2.5 py-1 rounded-lg border"
                style={{
                  borderColor:
                    activityFilter === opt.value
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  color: activityFilter === opt.value ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  background:
                    activityFilter === opt.value
                      ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                      : 'transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
            <Button size="sm" variant="ghost" loading={activityLoading} onClick={() => setStreamKey((k) => k + 1)}>
              {t('admin.treasuryRefresh')}
            </Button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {activity && (
            <div className="flex flex-wrap gap-4 font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              <span>
                {t('admin.treasuryActivityIn')}: {activity.summary?.sweepsIn ?? 0}
              </span>
              <span>
                {t('admin.treasuryActivityOut')}: {activity.summary?.payoutsOut ?? 0}
              </span>
              {(activity.explorerLinks || []).slice(0, 3).map((link) =>
                link.addressUrl ? (
                  <a
                    key={link.chainId}
                    href={link.addressUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {link.networkName} ↗
                  </a>
                ) : null
              )}
            </div>
          )}

          {activityError && <Alert>{activityError}</Alert>}

          {activityLoading && !activity ? (
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.treasuryRefreshing')}
            </p>
          ) : filteredActivity.length === 0 ? (
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.treasuryActivityEmpty')}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredActivity.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border px-3 py-3 space-y-2"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            color: ev.kind === 'IN' ? 'var(--color-success)' : 'var(--color-warning)',
                            background:
                              ev.kind === 'IN'
                                ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
                                : 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
                          }}
                        >
                          {ev.kind === 'IN' ? t('admin.treasuryKindIn') : t('admin.treasuryKindOut')}
                        </span>
                        <p className="font-semibold text-sm">
                          {ev.amount} {ev.tokenSymbol}
                          {ev.amountUsd ? (
                            <span className="font-mono text-xs font-normal ml-2" style={{ color: 'var(--color-text-muted)' }}>
                              · ${ev.amountUsd}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {ev.networkName}
                        {ev.userLabel ? ` · ${ev.userLabel}` : ''}
                        {ev.at ? ` · ${new Date(ev.at).toLocaleString()}` : ''}
                      </p>
                    </div>
                    {ev.referencePath && (
                      <Link
                        to={ev.referencePath}
                        className="font-mono text-[11px] hover:underline shrink-0"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {t('admin.treasuryOpen')}
                      </Link>
                    )}
                  </div>
                  {ev.txHash && (
                    <TxHashDisplay txHash={ev.txHash} explorer={ev.explorer} compact />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Attention + recent */}
      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--color-glass-border)' }}>
          <h2 className="section-label">{t('admin.reportAttention')}</h2>
          <div className="space-y-2">
            <AttentionRow
              label={t('admin.pendingDeposits')}
              value={overview.pending}
              hint={t('admin.attentionPendingHint')}
              warn={overview.pending > 0}
            />
            <AttentionRow
              label={t('admin.toSweep')}
              value={overview.confirmed}
              hint={t('admin.attentionSweepHint')}
              warn={overview.confirmed > 0}
            />
            <AttentionRow
              label={t('admin.withdrawQueue')}
              value={modules.withdrawals.pending}
              hint={t('admin.attentionWithdrawHint')}
              to="/admin/withdrawals"
              warn={modules.withdrawals.pending > 0}
            />
            <AttentionRow
              label={t('admin.failedWithdrawals')}
              value={modules.withdrawals.failed}
              to="/admin/withdrawals"
              warn={modules.withdrawals.failed > 0}
            />
          </div>
        </div>

        <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--color-glass-border)' }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="section-label">{t('admin.recentPayments')}</h2>
            <Link to="/admin/payments/recent" className="font-mono text-[11px] hover:underline" style={{ color: 'var(--color-accent)' }}>
              {t('pageCommon.viewAll')}
            </Link>
          </div>
          <div className="space-y-2">
            {recentPayments.length === 0 ? (
              <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('admin.noPaymentsYet')}
              </p>
            ) : (
              recentPayments.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  to={`/pay/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--color-accent)_35%,transparent)]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {p.amount} {p.tokenSymbol}
                    </p>
                    <p className="font-mono text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {p.networkName} · {p.userEmail}
                    </p>
                  </div>
                  <Badge status={p.status} />
                </Link>
              ))
            )}
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {t('admin.registeredUsers', { count: overview.users })}
              </p>
              <Link to="/admin/users" className="font-mono text-[11px] hover:underline" style={{ color: 'var(--color-accent)' }}>
                {t('pageCommon.viewAll')}
              </Link>
            </div>
            <div className="space-y-1.5">
              {users.slice(0, 4).map((u) => (
                <Link
                  key={u.id}
                  to={`/admin/users/${u.id}`}
                  className="flex items-center justify-between gap-2 font-mono text-xs py-1"
                >
                  <span className="truncate">{u.username || u.email || u.phone || '—'}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {t('admin.paymentsLabel', { count: u.paymentCount })}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div>
      <p className="uppercase tracking-wider text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="font-semibold tabular-nums mt-0.5" style={{ color: accent ? 'var(--color-accent)' : 'inherit' }}>
        {value}
      </p>
    </div>
  );
}

function AttentionRow({ label, value, hint, to, warn }) {
  const inner = (
    <div
      className="flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && (
          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {hint}
          </p>
        )}
      </div>
      <p
        className="font-mono text-lg font-bold tabular-nums shrink-0"
        style={{ color: warn && value > 0 ? 'var(--color-warning)' : 'inherit' }}
      >
        {value}
      </p>
    </div>
  );
  if (!to) return inner;
  return (
    <Link to={to} className="block hover:opacity-90">
      {inner}
    </Link>
  );
}
