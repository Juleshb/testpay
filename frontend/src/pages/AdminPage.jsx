import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAdminDashboard, triggerSweep, formatUptime } from '../adminApi';
import { shortenAddress } from '../wallet';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

export default function AdminPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const dashboard = await getAdminDashboard();
      setData(dashboard);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleSweep = async () => {
    setSweeping(true);
    setMessage('');
    try {
      const result = await triggerSweep();
      const ok = result.swept.filter((r) => r.success).length;
      setMessage(t('admin.sweepComplete', { count: ok }));
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSweeping(false);
    }
  };

  if (loading || !data) return <PageLoader message={t('pageCommon.loading.dashboard')} />;

  const { overview, volume, breakdown, system, recentPayments, users } = data;
  const maxNetworkCount = Math.max(...breakdown.byNetwork.map((n) => n.count), 1);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('admin.title')}
        label={t('admin.label')}
        description={t('admin.description', { uptime: formatUptime(system.uptimeSeconds) })}
        actions={
          <Button
            size="md"
            onClick={handleSweep}
            loading={sweeping}
            disabled={overview.confirmed === 0}
          >
            {t('admin.sweepConfirmed', { count: overview.confirmed })}
          </Button>
        }
      />

      {message && <Alert variant="warning" className="mb-6">{message}</Alert>}

      <section>
        <SectionTitle>{t('admin.overview')}</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label={t('admin.users')} value={overview.users} />
          <StatCard label={t('admin.admins')} value={overview.admins} />
          <StatCard label={t('admin.payments')} value={overview.payments} />
          <StatCard label={t('admin.today')} value={overview.paymentsToday} color="text-[var(--color-accent)]" />
          <StatCard label={t('admin.pending')} value={overview.pending} color="text-[var(--color-warning)]" />
          <StatCard label={t('admin.confirmed')} value={overview.confirmed} color="text-[var(--color-success)]" />
          <StatCard label={t('admin.swept')} value={overview.swept} color="text-[var(--color-accent)]" />
          <StatCard label={t('admin.successRate')} value={`${overview.successRate}%`} color="text-[var(--color-success)]" />
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="glass-panel p-6">
          <SectionTitle>{t('admin.platformWallets')}</SectionTitle>
          <dl className="space-y-3 text-sm">
            <InfoRow label={t('admin.treasury')} value={system.treasuryAddress} mono />
            <InfoRow label={t('admin.gasFunder')} value={system.gasFunderAddress} mono />
            <InfoRow label={t('admin.walletsGenerated')} value={system.walletsGenerated} />
          </dl>
        </div>
        <div className="glass-panel p-6">
          <SectionTitle>{t('admin.systemConfiguration')}</SectionTitle>
          <dl className="space-y-3 text-sm">
            <InfoRow label={t('admin.defaultNetwork')} value={system.defaultNetwork} />
            <InfoRow label={t('admin.defaultChainId')} value={system.defaultChainId} />
            <InfoRow label={t('admin.balancePollInterval')} value={`${system.pollIntervalMs / 1000}s`} />
            <InfoRow label={t('admin.autoSweepInterval')} value={`${system.sweepIntervalMs / 1000}s`} />
            <InfoRow label={t('admin.frontendUrl')} value={system.frontendUrl} />
            <InfoRow label={t('admin.serverStarted')} value={new Date(system.serverStartedAt).toLocaleString()} />
          </dl>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="glass-panel p-6">
          <SectionTitle>{t('admin.volume')}</SectionTitle>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t('admin.totalRequests')}</span>
              <span>{volume.totalPaymentRequests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('admin.approxTotalAmount')}</span>
              <span className="text-accent">{volume.approximateVolume}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('admin.confirmedSwept')}</span>
              <span className="text-green-400">{volume.confirmedVolume}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <SectionTitle>{t('admin.byNetwork')}</SectionTitle>
          <div className="space-y-2">
            {breakdown.byNetwork.length === 0 ? (
              <p className="text-muted text-sm">{t('admin.noPaymentsYet')}</p>
            ) : (
              breakdown.byNetwork.map((n) => (
                <BarRow key={n.name} label={n.name} count={n.count} max={maxNetworkCount} />
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-6">
          <SectionTitle>{t('admin.byToken')}</SectionTitle>
          <div className="space-y-2">
            {breakdown.byToken.length === 0 ? (
              <p className="text-muted text-sm">{t('admin.noPaymentsYet')}</p>
            ) : (
              breakdown.byToken.map((token) => (
                <div key={token.symbol} className="flex justify-between text-sm">
                  <span className="text-accent font-medium">{token.symbol}</span>
                  <span className="text-muted">{t('admin.paymentsCount', { count: token.count })}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>{t('admin.supportedNetworks', { count: system.supportedNetworks.length })}</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {system.supportedNetworks.map((n) => (
            <div key={n.chainId} className="bg-surface/60 border border-border rounded-xl p-3 text-sm">
              <div className="font-medium">{n.name}</div>
              <div className="text-muted text-xs mt-1">
                {t('admin.networkMeta', { native: n.nativeSymbol, tokens: n.tokenCount, chainId: n.chainId })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>{t('admin.recentPayments')}</SectionTitle>
          <Link to="/admin/payments/recent" className="font-mono text-xs hover:underline" style={{ color: 'var(--color-accent)' }}>
            {t('pageCommon.viewAll')}
          </Link>
        </div>
        <div className="hidden lg:block glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-left text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">{t('pageCommon.amount')}</th>
                  <th className="px-4 py-3">{t('pageCommon.user')}</th>
                  <th className="px-4 py-3">{t('pageCommon.network')}</th>
                  <th className="px-4 py-3">{t('pageCommon.status')}</th>
                  <th className="px-4 py-3">{t('admin.deposit')}</th>
                  <th className="px-4 py-3">{t('admin.created')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {p.amount} {p.tokenSymbol}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{p.userEmail}</td>
                    <td className="px-4 py-3 text-muted text-xs">{p.networkName}</td>
                    <td className="px-4 py-3">
                      <Badge status={p.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <a
                        href={`${system.supportedNetworks.find((n) => n.chainId === p.chainId)?.explorer || 'https://etherscan.io'}/address/${p.depositAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {shortenAddress(p.depositAddress)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/pay/${p.id}`} className="text-primary hover:underline text-xs">{t('pageCommon.view')}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:hidden space-y-3">
          {recentPayments.map((p) => (
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
                  <p className="font-mono text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {p.userEmail} · {p.networkName}
                  </p>
                </div>
                <Badge status={p.status} />
              </div>
              <p className="font-mono text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                {shortenAddress(p.depositAddress)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>{t('admin.registeredUsers', { count: overview.users })}</SectionTitle>
          <Link to="/admin/users" className="font-mono text-xs hover:underline" style={{ color: 'var(--color-accent)' }}>
            {t('pageCommon.viewAll')}
          </Link>
        </div>
        <div className="hidden md:block glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-left text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">{t('admin.email')}</th>
                  <th className="px-4 py-3">{t('admin.phone')}</th>
                  <th className="px-4 py-3">{t('admin.name')}</th>
                  <th className="px-4 py-3">{t('admin.payments')}</th>
                  <th className="px-4 py-3">{t('admin.joined')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-muted">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-muted">{u.name || '—'}</td>
                    <td className="px-4 py-3">{u.paymentCount}</td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-3">
          {users.map((u) => (
            <article key={u.id} className="glass-panel p-4">
              <p className="font-medium truncate">{u.email || u.phone || '—'}</p>
              {u.name && (
                <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {u.name}
                </p>
              )}
              <div className="flex items-center justify-between gap-2 mt-2 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span>{t('admin.paymentsLabel', { count: u.paymentCount })}</span>
                <span>{new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="eyebrow mb-4">{children}</h2>;
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className={mono ? 'font-mono text-xs text-accent break-all text-right' : 'text-right'}>
        {value}
      </dd>
    </div>
  );
}

function BarRow({ label, count, max }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted truncate">{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent"
          style={{ width: `${(count / max) * 100}%` }}
        />
      </div>
    </div>
  );
}
