import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listAdminPackages, createAdminPackage, updateAdminPackage } from '../adminApi';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../lib/cn';

const EMPTY_FORM = {
  name: '',
  slug: '',
  minAmount: '',
  maxAmount: '',
  dailyRate: '',
  durationDays: '',
  description: '',
  badgeColor: '#A2D5C6',
  sortOrder: '0',
  active: true,
};

export default function AdminPackagesPage() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = () => {
    listAdminPackages()
      .then(setPackages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (pkg) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      slug: pkg.slug,
      minAmount: pkg.minAmount,
      maxAmount: pkg.maxAmount || '',
      dailyRate: pkg.dailyRate,
      durationDays: String(pkg.durationDays),
      description: pkg.description || '',
      badgeColor: pkg.badgeColor,
      sortOrder: String(pkg.sortOrder),
      active: pkg.active,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...form,
        maxAmount: form.maxAmount === '' ? null : form.maxAmount,
        durationDays: parseInt(form.durationDays, 10),
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };
      if (editingId) {
        await updateAdminPackage(editingId, payload);
        setSuccess(t('admin.packagesPage.updated'));
      } else {
        await createAdminPackage(payload);
        setSuccess(t('admin.packagesPage.created'));
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (pkg) => {
    setTogglingId(pkg.id);
    setError('');
    try {
      await updateAdminPackage(pkg.id, { active: !pkg.active });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.packages')} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('admin.packagesPage.title')}
        label={t('admin.packagesPage.label')}
        actions={
          <div className="flex gap-2">
            <Link to="/admin">
              <Button variant="ghost" size="md">
                {t('admin.systemDashboard')}
              </Button>
            </Link>
            <Button size="md" onClick={openCreate}>
              {t('admin.packagesPage.newPackage')}
            </Button>
          </div>
        }
      />

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {showForm && (
        <section className="glass-panel p-6 max-w-2xl">
          <p className="section-label mb-4">
            {editingId ? t('admin.packagesPage.editPackage') : t('admin.packagesPage.newPackageForm')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('admin.packagesPage.name')} required>
                <input
                  className="dev-input w-full"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label={t('admin.packagesPage.slug')}>
                <input
                  className="dev-input w-full font-mono text-sm"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder={t('admin.packagesPage.slugPlaceholder')}
                />
              </Field>
              <Field label={t('admin.packagesPage.minAmount')} required>
                <input
                  type="number"
                  step="any"
                  className="dev-input w-full font-mono"
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                  required
                />
              </Field>
              <Field label={t('admin.packagesPage.maxAmount')}>
                <input
                  type="number"
                  step="any"
                  className="dev-input w-full font-mono"
                  value={form.maxAmount}
                  onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                  placeholder={t('admin.packagesPage.maxPlaceholder')}
                />
              </Field>
              <Field label={t('admin.packagesPage.dailyRate')} required>
                <input
                  type="number"
                  step="any"
                  className="dev-input w-full font-mono"
                  value={form.dailyRate}
                  onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
                  required
                />
              </Field>
              <Field label={t('admin.packagesPage.durationDays')} required>
                <input
                  type="number"
                  className="dev-input w-full font-mono"
                  value={form.durationDays}
                  onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                  required
                />
              </Field>
            </div>
            {editingId && (
              <p className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {t('admin.packagesPage.appliesImmediately')}
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('admin.packagesPage.badgeColor')}>
                <input
                  type="color"
                  className="h-10 w-full rounded cursor-pointer"
                  value={form.badgeColor}
                  onChange={(e) => setForm({ ...form, badgeColor: e.target.value })}
                />
              </Field>
              <Field label={t('admin.packagesPage.sortOrder')}>
                <input
                  type="number"
                  className="dev-input w-full font-mono"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </Field>
            </div>
            <Field label={t('admin.packagesPage.description')}>
              <textarea
                className="dev-input w-full min-h-[72px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            {editingId && (
              <label className="flex items-center gap-2 font-mono text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                {t('admin.packagesPage.activeVisible')}
              </label>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                {editingId ? t('admin.packagesPage.saveChanges') : t('admin.packagesPage.createPackage')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                {t('admin.packagesPage.cancel')}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section>
        <p className="section-label mb-4">{t('admin.packagesPage.allPackages', { count: packages.length })}</p>
        {packages.length === 0 ? (
          <div className="glass-panel">
            <EmptyState
              title={t('admin.packagesPage.emptyTitle')}
              description={t('admin.packagesPage.emptyDescription')}
              action={<Button onClick={openCreate}>{t('admin.packagesPage.newPackage')}</Button>}
            />
          </div>
        ) : (
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b font-mono text-xs uppercase tracking-wider text-left"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    <th className="px-4 py-3">{t('admin.packagesPage.package')}</th>
                    <th className="px-4 py-3">{t('admin.packagesPage.rate')}</th>
                    <th className="px-4 py-3">{t('admin.packagesPage.range')}</th>
                    <th className="px-4 py-3">{t('admin.packagesPage.duration')}</th>
                    <th className="px-4 py-3">{t('admin.packagesPage.investments')}</th>
                    <th className="px-4 py-3">{t('pageCommon.status')}</th>
                    <th className="px-4 py-3">{t('admin.packagesPage.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg) => (
                    <tr
                      key={pkg.id}
                      className={cn('border-b', !pkg.active && 'opacity-60')}
                      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: pkg.badgeColor }} />
                          <div>
                            <p className="font-medium text-sm">{pkg.name}</p>
                            <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{pkg.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">{pkg.dailyRate}%</td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">
                        {pkg.minAmount}
                        {pkg.maxAmount ? ` – ${pkg.maxAmount}` : '+'} USDT
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{pkg.durationDays}d</td>
                      <td className="px-4 py-3 font-mono text-xs">{pkg.investmentCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <StatusBadge active={pkg.active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}>
                            {t('admin.packagesPage.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={togglingId === pkg.id}
                            onClick={() => handleToggleActive(pkg)}
                          >
                            {pkg.active ? t('admin.packagesPage.deactivate') : t('admin.packagesPage.activate')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ active }) {
  const { t } = useTranslation();
  const color = active ? 'var(--color-success)' : 'var(--color-text-muted)';

  return (
    <span
      className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {active ? t('admin.packagesPage.statusActive') : t('admin.packagesPage.statusInactive')}
    </span>
  );
}
