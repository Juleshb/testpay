import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listAdminUsers, listAdminOnlineUsers, setAdminUserBlocked } from '../adminApi';
import UserAvatar from '../components/community/UserAvatar';
import { userDisplayId } from '../auth';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import SegmentedControl from '../components/ui/SegmentedControl';
import { PageLoader } from '../components/ui/Spinner';

const ROLE_OPTIONS = [
  { value: 'all', labelKey: 'admin.usersPage.roleAll' },
  { value: 'online', labelKey: 'admin.usersPage.filterOnline' },
  { value: 'USER', labelKey: 'admin.usersPage.roleUsers' },
  { value: 'ADMIN', labelKey: 'admin.usersPage.roleAdmins' },
  { value: 'blocked', labelKey: 'admin.usersPage.filterBlocked' },
];

function userLabel(u) {
  return u.email || u.phone || u.name || '—';
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () =>
    Promise.all([listAdminUsers(), listAdminOnlineUsers()])
      .then(([allUsers, onlineData]) => {
        setUsers(allUsers);
        setOnlineUsers(onlineData.users || []);
        setOnlineCount(onlineData.onlineUsers ?? 0);
      })
      .catch(console.error);

  useEffect(() => {
    load().finally(() => setLoading(false));

    const interval = setInterval(load, 20000);

    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role === 'online') {
        if (!u.isOnline) return false;
      } else if (role === 'blocked') {
        if (!u.blocked) return false;
      } else if (role !== 'all' && u.role !== role) {
        return false;
      }
      if (!q) return true;
      return [u.email, u.phone, u.name, u.username, u.id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, role, query]);

  const stats = useMemo(
    () => ({
      total: users.length,
      users: users.filter((u) => u.role === 'USER').length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
      blocked: users.filter((u) => u.blocked).length,
      online: onlineCount,
      withPayments: users.filter((u) => u.paymentCount > 0).length,
    }),
    [users, onlineCount]
  );

  const handleBlock = async (u, blocked) => {
    if (blocked && !window.confirm(t('admin.userDetail.confirmBlock'))) return;
    setBusyId(u.id);
    setError('');
    setMessage('');
    try {
      const data = await setAdminUserBlocked(u.id, blocked);
      setUsers((prev) =>
        prev.map((row) => (row.id === u.id ? { ...row, blocked: data.user.blocked } : row))
      );
      setMessage(blocked ? t('admin.userDetail.blockedSuccess') : t('admin.userDetail.unblockedSuccess'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.users')} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('admin.usersPage.title')}
        label={t('admin.usersPage.label')}
        description={t('admin.usersPage.description')}
        actions={
          <Link to="/admin">
            <Button variant="ghost" size="md">
              {t('admin.systemDashboard')}
            </Button>
          </Link>
        }
      />

      <section className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label={t('admin.usersPage.total')} value={stats.total} />
          <StatCard
            label={t('admin.usersPage.onlineNow')}
            value={stats.online}
            color="text-[var(--color-success)]"
          />
          <StatCard label={t('admin.users')} value={stats.users} color="text-[var(--color-accent)]" />
          <StatCard label={t('admin.admins')} value={stats.admins} color="text-[var(--color-warning)]" />
          <StatCard
            label={t('admin.usersPage.blockedCount')}
            value={stats.blocked}
            color="text-[var(--color-danger)]"
          />
          <StatCard label={t('admin.usersPage.withPayments')} value={stats.withPayments} color="text-[var(--color-success)]" />
        </div>

        {onlineUsers.length > 0 && (
          <section className="glass-panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="section-label inline-flex items-center gap-2">
                <span
                  className="mining-live-dot inline-block h-2 w-2 rounded-full"
                  style={{ background: 'var(--color-success)' }}
                />
                {t('admin.usersPage.onlineListTitle', { count: onlineCount })}
              </p>
              <button
                type="button"
                className="font-mono text-xs hover:underline"
                style={{ color: 'var(--color-accent)' }}
                onClick={() => setRole('online')}
              >
                {t('admin.usersPage.viewAllOnline')}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {onlineUsers.slice(0, 9).map((u) => (
                <Link
                  key={u.id}
                  to={`/admin/users/${u.id}`}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-success) 25%, transparent)' }}
                >
                  <UserAvatar name={userDisplayId(u)} userId={u.id} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold truncate">{userLabel(u)}</p>
                    <p className="font-mono text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {u.wsConnected
                        ? t('admin.usersPage.statusLive')
                        : t('admin.usersPage.lastSeen', {
                            time: formatLastSeen(u.lastSeenAt),
                          })}
                    </p>
                  </div>
                  <OnlineBadge compact />
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="section-label mb-2">{t('admin.usersPage.role')}</p>
            <SegmentedControl options={ROLE_OPTIONS} value={role} onChange={setRole} />
          </div>
          <div>
            <p className="section-label mb-2">{t('admin.usersPage.search')}</p>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('admin.usersPage.searchPlaceholder')}
              className="input-field w-full font-mono text-sm"
            />
          </div>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {filtered.length === 0 ? (
        <div className="glass-panel">
          <EmptyState
            title={t('admin.usersPage.emptyTitle')}
            description={query ? t('admin.usersPage.emptyFiltered') : t('admin.usersPage.emptyDefault')}
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
                    <th className="px-4 py-3 font-medium">{t('admin.usersPage.account')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.email')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.phone')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.name')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.usersPage.status')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.usersPage.roleHeader')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.usersPage.blocked')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.payments')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.usersPage.transactions')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.joined')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.usersPage.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b hover:bg-white/[0.02] transition-colors"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                    >
                      <td className="px-4 py-3.5 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {u.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3.5">{u.email || '—'}</td>
                      <td className="px-4 py-3.5 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {u.phone || '—'}
                      </td>
                      <td className="px-4 py-3.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {u.name || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {u.isOnline ? <OnlineBadge lastSeenAt={u.lastSeenAt} wsConnected={u.wsConnected} /> : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3.5">
                        {u.blocked ? <BlockedBadge /> : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums">{u.paymentCount}</td>
                      <td className="px-4 py-3.5 font-mono tabular-nums">{u.transactionCount ?? 0}</td>
                      <td className="px-4 py-3.5 font-mono text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/admin/users/${u.id}`}
                            className="font-mono text-xs hover:underline"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {t('admin.usersPage.viewAccount')}
                          </Link>
                          {u.role !== 'ADMIN' && (
                            <Button
                              size="sm"
                              variant={u.blocked ? 'primary' : 'danger'}
                              loading={busyId === u.id}
                              onClick={() => handleBlock(u, !u.blocked)}
                            >
                              {u.blocked ? t('admin.usersPage.unblock') : t('admin.usersPage.block')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((u) => (
              <Link key={u.id} to={`/admin/users/${u.id}`} className="block glass-panel p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold truncate">{userLabel(u)}</p>
                    {u.name && u.name !== userLabel(u) && (
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {u.name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {u.isOnline && <OnlineBadge compact lastSeenAt={u.lastSeenAt} wsConnected={u.wsConnected} />}
                    <RoleBadge role={u.role} />
                    {u.blocked && <BlockedBadge />}
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.payments')}</dt>
                    <dd>{u.paymentCount}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.usersPage.transactions')}</dt>
                    <dd>{u.transactionCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.joined')}</dt>
                    <dd>{new Date(u.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatLastSeen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleString();
}

function OnlineBadge({ compact = false, lastSeenAt, wsConnected }) {
  const { t } = useTranslation();

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-full uppercase shrink-0"
      style={{
        color: 'var(--color-success)',
        background: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)',
      }}
      title={
        wsConnected
          ? t('admin.usersPage.statusLive')
          : t('admin.usersPage.lastSeen', { time: formatLastSeen(lastSeenAt) })
      }
    >
      <span
        className="mining-live-dot inline-block h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: 'var(--color-success)' }}
      />
      {compact ? t('admin.usersPage.online') : t('admin.usersPage.statusOnline')}
    </span>
  );
}

function BlockedBadge() {
  const { t } = useTranslation();
  return (
    <span
      className="inline-block font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
      style={{
        color: 'var(--color-danger)',
        background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)',
      }}
    >
      {t('admin.usersPage.blocked')}
    </span>
  );
}

function RoleBadge({ role }) {
  const { t } = useTranslation();
  const isAdmin = role === 'ADMIN';
  const label = isAdmin ? t('admin.usersPage.roleAdmins') : t('admin.usersPage.roleUsers');

  return (
    <span
      className="inline-block font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
      style={{
        color: isAdmin ? 'var(--color-warning)' : 'var(--color-accent)',
        background: isAdmin
          ? 'color-mix(in srgb, var(--color-warning) 12%, transparent)'
          : 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
        border: `1px solid color-mix(in srgb, ${isAdmin ? 'var(--color-warning)' : 'var(--color-accent)'} 25%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
