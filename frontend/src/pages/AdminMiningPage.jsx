import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  listAdminMining,
  createAdminMining,
  updateAdminMining,
  deleteAdminMining,
} from '../adminApi';
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
  durationDays: '1',
  sessionHours: '24',
  hashRate: '',
  coin: 'BTC',
  description: '',
  badgeColor: '#A2D5C6',
  sortOrder: '0',
  active: true,
  isFree: false,
};

export default function AdminMiningPage() {
  const { t } = useTranslation();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = () => {
    listAdminMining()
      .then(setOptions)
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

  const openEdit = (option) => {
    setEditingId(option.id);
    setForm({
      name: option.name,
      slug: option.slug,
      minAmount: option.minAmount,
      maxAmount: option.maxAmount || '',
      dailyRate: option.dailyRate,
      durationDays: String(option.durationDays),
      sessionHours: option.sessionHours != null ? String(option.sessionHours) : '',
      hashRate: option.hashRate || '',
      coin: option.coin || 'BTC',
      description: option.description || '',
      badgeColor: option.badgeColor,
      sortOrder: String(option.sortOrder),
      active: option.active,
      isFree: Boolean(option.isFree),
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
        sessionHours: form.sessionHours === '' ? null : parseInt(form.sessionHours, 10),
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };
      if (editingId) {
        await updateAdminMining(editingId, payload);
        setSuccess(t('admin.miningPage.updated'));
      } else {
        await createAdminMining(payload);
        setSuccess(t('admin.miningPage.created'));
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (option) => {
    setTogglingId(option.id);
    setError('');
    try {
      await updateAdminMining(option.id, { active: !option.active });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (option) => {
    if (!window.confirm(t('admin.miningPage.confirmDelete', { name: option.name }))) return;
    setError('');
    try {
      await deleteAdminMining(option.id);
      setSuccess(t('admin.miningPage.deleted'));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.mining')} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('admin.miningPage.title')}
        label={t('admin.miningPage.label')}
        actions={
          <div className="flex gap-2">
            <Link to="/admin">
              <Button variant="ghost" size="md">
                {t('admin.systemDashboard')}
              </Button>
            </Link>
            <Button size="md" onClick={openCreate}>
              {t('admin.miningPage.newOption')}
            </Button>
          </div>
        }
      />

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {showForm && (
        <section className="glass-panel p-6 max-w-2xl">
          <p className="section-label mb-4">
            {editingId ? t('admin.miningPage.editOption') : t('admin.miningPage.newOptionForm')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('admin.miningPage.name')} required>
                <input
                  className="dev-input w-full"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label={t('admin.miningPage.slug')}>
                <input
                  className="dev-input w-full font-mono text-sm"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder={t('admin.miningPage.slugPlaceholder')}
                />
              </Field>
              <Field label={t('admin.miningPage.minAmount')} required>
                <input
                  type="number"
                  step="any"
                  className="dev-input w-full font-mono"
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                  required
                />
              </Field>
              <Field label={t('admin.miningPage.maxAmount')}>
                <input
                  type="number"
                  step="any"
                  className="dev-input w-full font-mono"
                  value={form.maxAmount}
                  onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                  placeholder={t('admin.miningPage.maxPlaceholder')}
                />
              </Field>
              <Field label={t('admin.miningPage.dailyRate')} required>
                <input
                  type="number"
                  step="any"
                  className="dev-input w-full font-mono"
                  value={form.dailyRate}
                  onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
                  required
                />
              </Field>
              <Field label={t('admin.miningPage.sessionHours')}>
                <input
                  type="number"
                  className="dev-input w-full font-mono"
                  value={form.sessionHours}
                  onChange={(e) => setForm({ ...form, sessionHours: e.target.value })}
                  placeholder="24"
                />
              </Field>
              <Field label={t('admin.miningPage.durationDays')} required>
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
                {t('admin.miningPage.appliesImmediately')}
              </p>
            )}
            <p className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.miningPage.sessionHoursHint')}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('admin.miningPage.hashRate')} required>
                <input
                  className="dev-input w-full font-mono"
                  value={form.hashRate}
                  onChange={(e) => setForm({ ...form, hashRate: e.target.value })}
                  placeholder="100 TH/s"
                  required
                />
              </Field>
              <Field label={t('admin.miningPage.coin')}>
                <input
                  className="dev-input w-full font-mono"
                  value={form.coin}
                  onChange={(e) => setForm({ ...form, coin: e.target.value })}
                />
              </Field>
              <Field label={t('admin.miningPage.badgeColor')}>
                <input
                  type="color"
                  className="h-10 w-full rounded cursor-pointer"
                  value={form.badgeColor}
                  onChange={(e) => setForm({ ...form, badgeColor: e.target.value })}
                />
              </Field>
              <Field label={t('admin.miningPage.sortOrder')}>
                <input
                  type="number"
                  className="dev-input w-full font-mono"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </Field>
            </div>
            <Field label={t('admin.miningPage.description')}>
              <textarea
                className="dev-input w-full min-h-[72px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 font-mono text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
              />
              {t('admin.miningPage.isFree')}
            </label>
            {editingId && (
              <label className="flex items-center gap-2 font-mono text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                {t('admin.miningPage.activeVisible')}
              </label>
            )}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                {editingId ? t('admin.miningPage.saveChanges') : t('admin.miningPage.createOption')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                {t('admin.miningPage.cancel')}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section>
        <p className="section-label mb-4">{t('admin.miningPage.allOptions', { count: options.length })}</p>
        {options.length === 0 ? (
          <div className="glass-panel">
            <EmptyState
              title={t('admin.miningPage.emptyTitle')}
              description={t('admin.miningPage.emptyDescription')}
              action={<Button onClick={openCreate}>{t('admin.miningPage.newOption')}</Button>}
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
                    <th className="px-4 py-3">{t('admin.miningPage.option')}</th>
                    <th className="px-4 py-3">{t('admin.miningPage.rate')}</th>
                    <th className="px-4 py-3">{t('admin.miningPage.hashRate')}</th>
                    <th className="px-4 py-3">{t('admin.miningPage.range')}</th>
                    <th className="px-4 py-3">{t('admin.miningPage.duration')}</th>
                    <th className="px-4 py-3">{t('admin.miningPage.positions')}</th>
                    <th className="px-4 py-3">{t('pageCommon.status')}</th>
                    <th className="px-4 py-3">{t('admin.miningPage.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((option) => (
                    <tr
                      key={option.id}
                      className={cn('border-b', !option.active && 'opacity-60')}
                      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: option.badgeColor }}
                          />
                          <div>
                            <p className="font-medium text-sm">{option.name}</p>
                            <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                              {option.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">{option.dailyRate}%</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {option.hashRate} · {option.coin}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">
                        {option.minAmount}
                        {option.maxAmount ? ` – ${option.maxAmount}` : '+'} USD
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {option.sessionHours ? `${option.sessionHours}h` : `${option.durationDays}d`}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{option.positionCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge active={option.active} />
                          {option.isFree && (
                            <span
                              className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
                              style={{
                                color: 'var(--color-accent)',
                                background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                              }}
                            >
                              {t('admin.miningPage.free')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(option)}>
                            {t('admin.miningPage.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={togglingId === option.id}
                            onClick={() => handleToggleActive(option)}
                          >
                            {option.active
                              ? t('admin.miningPage.deactivate')
                              : t('admin.miningPage.activate')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(option)}>
                            {t('admin.miningPage.delete')}
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
        {label}
        {required ? ' *' : ''}
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
      {active ? t('admin.miningPage.statusActive') : t('admin.miningPage.statusInactive')}
    </span>
  );
}
