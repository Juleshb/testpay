import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listAdminUsers } from '../adminApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import SegmentedControl from '../components/ui/SegmentedControl';
import { PageLoader } from '../components/ui/Spinner';

const ROLE_OPTIONS = [
  { value: 'all', labelKey: 'admin.usersPage.roleAll' },
  { value: 'USER', labelKey: 'admin.usersPage.roleUsers' },
  { value: 'ADMIN', labelKey: 'admin.usersPage.roleAdmins' },
];

function userLabel(u) {
  return u.email || u.phone || u.name || '—';
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    listAdminUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      listAdminUsers().then(setUsers).catch(console.error);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (!q) return true;
      return [u.email, u.phone, u.name, u.id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, role, query]);

  const stats = useMemo(
    () => ({
      total: users.length,
      users: users.filter((u) => u.role === 'USER').length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
      withPayments: users.filter((u) => u.paymentCount > 0).length,
    }),
    [users]
  );

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t('admin.usersPage.total')} value={stats.total} />
          <StatCard label={t('admin.users')} value={stats.users} color="text-[var(--color-accent)]" />
          <StatCard label={t('admin.admins')} value={stats.admins} color="text-[var(--color-warning)]" />
          <StatCard label={t('admin.usersPage.withPayments')} value={stats.withPayments} color="text-[var(--color-success)]" />
        </div>

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
                    <th className="px-4 py-3 font-medium">{t('admin.usersPage.roleHeader')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.payments')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.joined')}</th>
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
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums">{u.paymentCount}</td>
                      <td className="px-4 py-3.5 font-mono text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((u) => (
              <div key={u.id} className="glass-panel p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold truncate">{userLabel(u)}</p>
                    {u.name && u.name !== userLabel(u) && (
                      <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {u.name}
                      </p>
                    )}
                  </div>
                  <RoleBadge role={u.role} />
                </div>
                <dl className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.payments')}</dt>
                    <dd>{u.paymentCount}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-text-muted)' }}>{t('admin.joined')}</dt>
                    <dd>{new Date(u.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
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
