import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAdminUserAccount, setAdminUserBlocked } from '../adminApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import SegmentedControl from '../components/ui/SegmentedControl';
import { PageLoader } from '../components/ui/Spinner';
import TxHashDisplay from '../components/TxHashDisplay';
import { useAuth } from '../AuthContext';

const TABS = [
  { value: 'ledger', labelKey: 'admin.userDetail.tabLedger' },
  { value: 'payments', labelKey: 'admin.userDetail.tabPayments' },
  { value: 'withdrawals', labelKey: 'admin.userDetail.tabWithdrawals' },
  { value: 'packages', labelKey: 'admin.userDetail.tabPackages' },
  { value: 'mining', labelKey: 'admin.userDetail.tabMining' },
  { value: 'transfers', labelKey: 'admin.userDetail.tabTransfers' },
];

function userLabel(u) {
  if (!u) return '—';
  return u.username || u.email || u.phone || u.name || u.id?.slice(0, 8) || '—';
}

function Money({ amount, type }) {
  const n = parseFloat(amount) || 0;
  const sign = type === 'CREDIT' ? '+' : type === 'DEBIT' ? '−' : '';
  const color =
    type === 'CREDIT' ? 'var(--color-success)' : type === 'DEBIT' ? 'var(--color-danger)' : 'inherit';
  return (
    <span className="font-mono tabular-nums" style={{ color }}>
      {sign}${Math.abs(n).toFixed(n < 1 && n > 0 ? 6 : 2)}
    </span>
  );
}

export default function AdminUserDetailPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [tab, setTab] = useState('ledger');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getAdminUserAccount(id)
      .then((account) => {
        if (!cancelled) setData(account);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || t('admin.userDetail.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const sourceOptions = useMemo(() => {
    const types = new Set((data?.ledger || []).map((row) => row.sourceType));
    return [
      { value: 'all', labelKey: 'admin.userDetail.filterAll' },
      ...[...types].sort().map((value) => ({ value, label: value.replace(/_/g, ' ') })),
    ];
  }, [data?.ledger]);

  const ledgerRows = useMemo(() => {
    const rows = data?.ledger || [];
    if (sourceFilter === 'all') return rows;
    return rows.filter((row) => row.sourceType === sourceFilter);
  }, [data?.ledger, sourceFilter]);

  if (loading) return <PageLoader message={t('pageCommon.loading.users')} />;

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('admin.userDetail.title')}
          label={t('admin.userDetail.label')}
          actions={
            <Link to="/admin/users">
              <Button variant="ghost" size="md">
                {t('admin.userDetail.back')}
              </Button>
            </Link>
          }
        />
        <div className="glass-panel">
          <EmptyState title={t('admin.userDetail.loadError')} description={error} />
        </div>
      </div>
    );
  }

  const { user, balance } = data;
  const canBlock = user.role !== 'ADMIN' && user.id !== me?.id;

  const handleBlock = async (blocked) => {
    if (blocked && !window.confirm(t('admin.userDetail.confirmBlock'))) return;
    setBlocking(true);
    setError('');
    setMessage('');
    try {
      const result = await setAdminUserBlocked(user.id, blocked, blocked ? blockReason : '');
      setData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          blocked: result.user.blocked,
          blockedAt: result.user.blockedAt,
          blockedReason: result.user.blockedReason,
        },
      }));
      if (!blocked) setBlockReason('');
      setMessage(blocked ? t('admin.userDetail.blockedSuccess') : t('admin.userDetail.unblockedSuccess'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBlocking(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={userLabel(user)}
        label={t('admin.userDetail.label')}
        description={t('admin.userDetail.description')}
        actions={
          <Link to="/admin/users">
            <Button variant="ghost" size="md">
              {t('admin.userDetail.back')}
            </Button>
          </Link>
        }
      />

      {error && <Alert>{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <section className="glass-panel p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-lg">{userLabel(user)}</p>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {user.id}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user.blocked && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
                style={{
                  color: 'var(--color-danger)',
                  background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)',
                }}
              >
                {t('admin.userDetail.blocked')}
              </span>
            )}
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
              style={{
                color: user.role === 'ADMIN' ? 'var(--color-warning)' : 'var(--color-accent)',
                background:
                  user.role === 'ADMIN'
                    ? 'color-mix(in srgb, var(--color-warning) 12%, transparent)'
                    : 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                border: `1px solid color-mix(in srgb, ${
                  user.role === 'ADMIN' ? 'var(--color-warning)' : 'var(--color-accent)'
                } 25%, transparent)`,
              }}
            >
              {user.role}
            </span>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div>
            <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.email')}</dt>
            <dd className="mt-0.5 break-all">{user.email || '—'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.phone')}</dt>
            <dd className="mt-0.5">{user.phone || '—'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.name')}</dt>
            <dd className="mt-0.5">{user.name || '—'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.joined')}</dt>
            <dd className="mt-0.5">{new Date(user.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.userDetail.inviteCode')}</dt>
            <dd className="mt-0.5">{user.inviteCode || '—'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.userDetail.referredBy')}</dt>
            <dd className="mt-0.5">
              {user.referredBy ? (
                <Link
                  to={`/admin/users/${user.referredBy.id}`}
                  className="hover:underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {user.referredBy.label}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
        {canBlock && (
          <div
            className="pt-4 border-t space-y-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {user.blocked ? (
              <p className="font-mono text-xs" style={{ color: 'var(--color-danger)' }}>
                {t('admin.userDetail.blockedHint')}
                {user.blockedAt ? ` · ${new Date(user.blockedAt).toLocaleString()}` : ''}
                {user.blockedReason ? ` · ${user.blockedReason}` : ''}
              </p>
            ) : (
              <div>
                <label className="section-label mb-2 block" htmlFor="blockReason">
                  {t('admin.userDetail.reason')}
                </label>
                <input
                  id="blockReason"
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder={t('admin.userDetail.reasonPlaceholder')}
                  className="input-field w-full font-mono text-sm"
                  maxLength={500}
                />
              </div>
            )}
            <Button
              type="button"
              variant={user.blocked ? 'primary' : 'danger'}
              size="md"
              loading={blocking}
              onClick={() => handleBlock(!user.blocked)}
            >
              {user.blocked ? t('admin.userDetail.unblock') : t('admin.userDetail.block')}
            </Button>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label={t('admin.userDetail.available')} value={`$${balance.availableUsd}`} color="text-[var(--color-success)]" />
        <StatCard label={t('admin.userDetail.credited')} value={`$${balance.totalCreditedUsd}`} />
        <StatCard label={t('admin.userDetail.debited')} value={`$${balance.totalDebitedUsd}`} color="text-[var(--color-danger)]" />
        <StatCard label={t('admin.userDetail.ledgerCount')} value={data.ledger.length} color="text-[var(--color-accent)]" />
      </section>

      <section className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <SegmentedControl options={TABS} value={tab} onChange={setTab} className="min-w-[36rem]" />
        </div>

        {tab === 'ledger' && (
          <div className="space-y-3">
            <div>
              <p className="section-label mb-2">{t('admin.userDetail.filterSource')}</p>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="input-field w-full sm:w-auto font-mono text-sm min-w-[12rem]"
              >
                {sourceOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.labelKey ? t(o.labelKey) : o.label}
                  </option>
                ))}
              </select>
            </div>
            {ledgerRows.length === 0 ? (
              <div className="glass-panel">
                <EmptyState
                  title={t('admin.userDetail.emptyLedger')}
                  description={t('admin.userDetail.emptyLedgerHint')}
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
                          <th className="px-4 py-3">{t('admin.userDetail.type')}</th>
                          <th className="px-4 py-3">{t('admin.userDetail.source')}</th>
                          <th className="px-4 py-3">{t('admin.userDetail.detail')}</th>
                          <th className="px-4 py-3 text-right">{t('pageCommon.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b align-top"
                            style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                          >
                            <td className="px-4 py-3 font-mono text-xs tabular-nums whitespace-nowrap">
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <TypeBadge type={row.type} />
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm">{row.label}</p>
                              <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                {row.sourceType}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {row.detail || '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Money amount={row.amountUsd} type={row.type} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="md:hidden space-y-3">
                  {ledgerRows.map((row) => (
                    <article key={row.id} className="glass-panel p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{row.label}</p>
                          <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(row.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Money amount={row.amountUsd} type={row.type} />
                      </div>
                      <div className="flex items-center gap-2">
                        <TypeBadge type={row.type} />
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          {row.sourceType}
                        </span>
                      </div>
                      {row.detail && (
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {row.detail}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <SimpleTable
            empty={t('admin.userDetail.emptyPayments')}
            rows={data.payments}
            columns={[
              {
                key: 'createdAt',
                label: t('pageCommon.date'),
                render: (r) => new Date(r.createdAt).toLocaleString(),
              },
              { key: 'status', label: t('admin.userDetail.status'), render: (r) => r.status },
              {
                key: 'amount',
                label: t('pageCommon.amount'),
                render: (r) => `${r.paidAmount || r.amount} ${r.tokenSymbol}`,
              },
              { key: 'network', label: t('admin.userDetail.network'), render: (r) => r.networkName },
              {
                key: 'usd',
                label: 'USD',
                render: (r) => (r.usdAmount ? `$${r.usdAmount}` : '—'),
              },
            ]}
          />
        )}

        {tab === 'withdrawals' && (
          <SimpleTable
            empty={t('admin.userDetail.emptyWithdrawals')}
            rows={data.withdrawals}
            columns={[
              {
                key: 'createdAt',
                label: t('pageCommon.date'),
                render: (r) => new Date(r.createdAt).toLocaleString(),
              },
              { key: 'status', label: t('admin.userDetail.status'), render: (r) => r.status },
              {
                key: 'amount',
                label: t('pageCommon.amount'),
                render: (r) => `$${r.amountUsd} → ${r.tokenAmount} ${r.tokenSymbol}`,
              },
              { key: 'network', label: t('admin.userDetail.network'), render: (r) => r.networkName },
              {
                key: 'dest',
                label: t('admin.userDetail.destination'),
                render: (r) => `${r.destinationAddress.slice(0, 10)}…`,
              },
              {
                key: 'tx',
                label: t('admin.userDetail.txHash'),
                render: (r) =>
                  r.txHash ? (
                    <TxHashDisplay txHash={r.txHash} explorer={r.explorer} compact />
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        )}

        {tab === 'packages' && (
          <div className="space-y-6">
            <div>
              <p className="section-label mb-3">{t('admin.userDetail.investments')}</p>
              <SimpleTable
                empty={t('admin.userDetail.emptyPackages')}
                rows={data.packageInvestments}
                columns={[
                  {
                    key: 'createdAt',
                    label: t('pageCommon.date'),
                    render: (r) => new Date(r.createdAt).toLocaleString(),
                  },
                  {
                    key: 'name',
                    label: t('admin.userDetail.package'),
                    render: (r) => r.package?.name || '—',
                  },
                  { key: 'amount', label: t('pageCommon.amount'), render: (r) => `$${r.amount}` },
                  { key: 'earned', label: t('admin.userDetail.earned'), render: (r) => `$${r.totalEarned}` },
                  { key: 'status', label: t('admin.userDetail.status'), render: (r) => r.status },
                ]}
              />
            </div>
            <div>
              <p className="section-label mb-3">{t('admin.userDetail.packageIncome')}</p>
              <SimpleTable
                empty={t('admin.userDetail.emptyPackageIncome')}
                rows={data.packageIncomes}
                columns={[
                  {
                    key: 'accrualDate',
                    label: t('pageCommon.date'),
                    render: (r) => new Date(r.accrualDate).toLocaleDateString(),
                  },
                  { key: 'name', label: t('admin.userDetail.package'), render: (r) => r.packageName },
                  { key: 'amount', label: t('pageCommon.amount'), render: (r) => `$${r.amount}` },
                  {
                    key: 'loan',
                    label: t('admin.userDetail.loanRepayment'),
                    render: (r) => (r.loanRepaymentUsd ? `$${r.loanRepaymentUsd}` : '—'),
                  },
                ]}
              />
            </div>
          </div>
        )}

        {tab === 'mining' && (
          <div className="space-y-6">
            <div>
              <p className="section-label mb-3">{t('admin.userDetail.positions')}</p>
              <SimpleTable
                empty={t('admin.userDetail.emptyMining')}
                rows={data.miningPositions}
                columns={[
                  {
                    key: 'createdAt',
                    label: t('pageCommon.date'),
                    render: (r) => new Date(r.createdAt).toLocaleString(),
                  },
                  {
                    key: 'name',
                    label: t('admin.userDetail.option'),
                    render: (r) => r.option?.name || '—',
                  },
                  { key: 'amount', label: t('pageCommon.amount'), render: (r) => `$${r.amount}` },
                  { key: 'earned', label: t('admin.userDetail.earned'), render: (r) => `$${r.totalEarned}` },
                  { key: 'status', label: t('admin.userDetail.status'), render: (r) => r.status },
                ]}
              />
            </div>
            <div>
              <p className="section-label mb-3">{t('admin.userDetail.miningIncome')}</p>
              <SimpleTable
                empty={t('admin.userDetail.emptyMiningIncome')}
                rows={data.miningIncomes}
                columns={[
                  {
                    key: 'accrualDate',
                    label: t('pageCommon.date'),
                    render: (r) => new Date(r.accrualDate).toLocaleDateString(),
                  },
                  { key: 'name', label: t('admin.userDetail.option'), render: (r) => r.optionName },
                  {
                    key: 'amount',
                    label: t('pageCommon.amount'),
                    render: (r) => `${r.amount} ${r.tokenSymbol}`,
                  },
                ]}
              />
            </div>
          </div>
        )}

        {tab === 'transfers' && (
          <div className="space-y-6">
            <div>
              <p className="section-label mb-3">{t('admin.userDetail.sent')}</p>
              <SimpleTable
                empty={t('admin.userDetail.emptyTransfers')}
                rows={data.transfersSent}
                columns={[
                  {
                    key: 'createdAt',
                    label: t('pageCommon.date'),
                    render: (r) => new Date(r.createdAt).toLocaleString(),
                  },
                  {
                    key: 'to',
                    label: t('admin.userDetail.to'),
                    render: (r) =>
                      r.toUserId ? (
                        <Link to={`/admin/users/${r.toUserId}`} className="hover:underline" style={{ color: 'var(--color-accent)' }}>
                          {r.to}
                        </Link>
                      ) : (
                        r.to
                      ),
                  },
                  { key: 'amount', label: t('pageCommon.amount'), render: (r) => `$${r.amountUsd}` },
                  { key: 'note', label: t('admin.userDetail.note'), render: (r) => r.note || '—' },
                ]}
              />
            </div>
            <div>
              <p className="section-label mb-3">{t('admin.userDetail.received')}</p>
              <SimpleTable
                empty={t('admin.userDetail.emptyTransfers')}
                rows={data.transfersReceived}
                columns={[
                  {
                    key: 'createdAt',
                    label: t('pageCommon.date'),
                    render: (r) => new Date(r.createdAt).toLocaleString(),
                  },
                  {
                    key: 'from',
                    label: t('admin.userDetail.from'),
                    render: (r) =>
                      r.fromUserId ? (
                        <Link
                          to={`/admin/users/${r.fromUserId}`}
                          className="hover:underline"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {r.from}
                        </Link>
                      ) : (
                        r.from
                      ),
                  },
                  { key: 'amount', label: t('pageCommon.amount'), render: (r) => `$${r.amountUsd}` },
                  { key: 'note', label: t('admin.userDetail.note'), render: (r) => r.note || '—' },
                ]}
              />
            </div>
            {data.loans?.length > 0 && (
              <div>
                <p className="section-label mb-3">{t('admin.userDetail.loans')}</p>
                <SimpleTable
                  empty={t('admin.userDetail.emptyLoans')}
                  rows={data.loans}
                  columns={[
                    {
                      key: 'createdAt',
                      label: t('pageCommon.date'),
                      render: (r) => new Date(r.createdAt).toLocaleString(),
                    },
                    {
                      key: 'principal',
                      label: t('admin.userDetail.principal'),
                      render: (r) => `$${r.principalUsd}`,
                    },
                    { key: 'owed', label: t('admin.userDetail.owed'), render: (r) => `$${r.totalOwedUsd}` },
                    { key: 'paid', label: t('admin.userDetail.paid'), render: (r) => `$${r.paidUsd}` },
                    { key: 'status', label: t('admin.userDetail.status'), render: (r) => r.status },
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function TypeBadge({ type }) {
  const credit = type === 'CREDIT';
  return (
    <span
      className="inline-block font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
      style={{
        color: credit ? 'var(--color-success)' : 'var(--color-danger)',
        background: `color-mix(in srgb, ${credit ? 'var(--color-success)' : 'var(--color-danger)'} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${credit ? 'var(--color-success)' : 'var(--color-danger)'} 25%, transparent)`,
      }}
    >
      {type}
    </span>
  );
}

function SimpleTable({ rows, columns, empty }) {
  if (!rows?.length) {
    return (
      <div className="glass-panel">
        <EmptyState title={empty} />
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b font-mono text-xs uppercase tracking-wider text-left"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 font-mono text-xs">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="glass-panel p-4 space-y-2">
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3 text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>{col.label}</span>
                <span className="font-mono text-right">{col.render(row)}</span>
              </div>
            ))}
          </article>
        ))}
      </div>
    </>
  );
}
