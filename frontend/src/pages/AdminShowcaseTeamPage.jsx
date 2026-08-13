import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  listAdminShowcaseTeam,
  createAdminShowcaseMember,
  updateAdminShowcaseMember,
  deleteAdminShowcaseMember,
} from '../adminApi';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import UserAvatar from '../components/community/UserAvatar';
import { Label, Input } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../lib/cn';

const EMPTY_FORM = {
  name: '',
  role: '',
  avatarUrl: '',
  sortOrder: '0',
  active: true,
};

export default function AdminShowcaseTeamPage() {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    listAdminShowcaseTeam()
      .then(setMembers)
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

  const openEdit = (member) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      role: member.role,
      avatarUrl: member.avatarUrl?.startsWith('https://api.dicebear.com') ? '' : member.avatarUrl || '',
      sortOrder: String(member.sortOrder ?? 0),
      active: member.active,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
      active: form.active,
      avatarUrl: form.avatarUrl.trim() || null,
    };
    try {
      if (editingId) {
        await updateAdminShowcaseMember(editingId, payload);
        setSuccess(t('admin.showcaseTeamPage.updated'));
      } else {
        await createAdminShowcaseMember(payload);
        setSuccess(t('admin.showcaseTeamPage.added'));
      }
      closeForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member) => {
    setError('');
    setSuccess('');
    try {
      await updateAdminShowcaseMember(member.id, { active: !member.active });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(t('admin.showcaseTeamPage.removeConfirm', { name: member.name }))) return;
    setDeletingId(member.id);
    setError('');
    setSuccess('');
    try {
      await deleteAdminShowcaseMember(member.id);
      setSuccess(t('admin.showcaseTeamPage.removed', { name: member.name }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.showcaseTeam')} />;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={t('admin.showcaseTeamPage.title')}
        label={t('admin.showcaseTeamPage.label')}
        description={t('admin.showcaseTeamPage.description')}
        actions={
          <Button size="md" onClick={openCreate}>
            {t('admin.showcaseTeamPage.addMember')}
          </Button>
        }
      />

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {showForm && (
        <section className="glass-panel p-4 sm:p-6 max-w-lg">
          <p className="section-label mb-4">
            {editingId ? t('admin.showcaseTeamPage.editMember') : t('admin.showcaseTeamPage.newMember')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('admin.showcaseTeamPage.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>{t('admin.showcaseTeamPage.roleTitle')}</Label>
              <Input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder={t('admin.showcaseTeamPage.rolePlaceholder')}
                required
              />
            </div>
            <div>
              <Label>{t('admin.showcaseTeamPage.avatarUrl')}</Label>
              <Input
                value={form.avatarUrl}
                onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                placeholder={t('admin.showcaseTeamPage.avatarPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('admin.showcaseTeamPage.sortOrder')}</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>{t('admin.showcaseTeamPage.visibleOnLanding')}</span>
            </label>
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                {editingId ? t('admin.showcaseTeamPage.saveChanges') : t('admin.showcaseTeamPage.addMemberBtn')}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm}>
                {t('admin.showcaseTeamPage.cancel')}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section>
        <p className="section-label mb-3">{t('admin.showcaseTeamPage.teamStructure')}</p>
        {members.length === 0 ? (
          <EmptyState
            title={t('admin.showcaseTeamPage.emptyTitle')}
            description={t('admin.showcaseTeamPage.emptyDescription')}
          />
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <article key={member.id} className="glass-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <UserAvatar
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    userId={member.id}
                    size={48}
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {member.name}
                    </p>
                    <p className="font-mono text-xs truncate" style={{ color: 'var(--color-accent)' }}>
                      {member.role}
                    </p>
                    <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {t('admin.showcaseTeamPage.order', { order: member.sortOrder })}
                      {!member.active && ` · ${t('admin.showcaseTeamPage.hidden')}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(member)}>
                    {t('admin.showcaseTeamPage.edit')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(member)}>
                    {member.active ? t('admin.showcaseTeamPage.hide') : t('admin.showcaseTeamPage.show')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={deletingId === member.id}
                    onClick={() => handleDelete(member)}
                    className={cn('text-[var(--color-danger)]')}
                  >
                    {t('admin.showcaseTeamPage.remove')}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
