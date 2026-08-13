import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { listAdminTestimonials, updateAdminTestimonial, deleteAdminTestimonial } from '../adminApi';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../lib/cn';

function Stars({ rating }) {
  return (
    <span className="font-mono text-xs" style={{ color: 'var(--color-warning)' }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

export default function AdminTestimonialsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    listAdminTestimonials()
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (row) => {
    setBusyId(row.id);
    setError('');
    setSuccess('');
    try {
      await updateAdminTestimonial(row.id, { active: true });
      setSuccess(t('admin.testimonialsPage.approved', { name: row.name }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleHide = async (row) => {
    setBusyId(row.id);
    setError('');
    setSuccess('');
    try {
      await updateAdminTestimonial(row.id, { active: false });
      setSuccess(t('admin.testimonialsPage.hidden', { name: row.name }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(t('admin.testimonialsPage.deleteConfirm', { name: row.name }))) return;
    setBusyId(row.id);
    setError('');
    setSuccess('');
    try {
      await deleteAdminTestimonial(row.id);
      setSuccess(t('admin.testimonialsPage.deleted', { name: row.name }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.testimonials')} />;

  const pending = rows.filter((row) => row.publicSubmission && !row.active);
  const published = rows.filter((row) => row.active);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={t('admin.testimonialsPage.title')}
        label={t('admin.testimonialsPage.label')}
        description={t('admin.testimonialsPage.description')}
      />

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <section>
        <p className="section-label mb-3">{t('admin.testimonialsPage.pendingApproval', { count: pending.length })}</p>
        {pending.length === 0 ? (
          <EmptyState
            title={t('admin.testimonialsPage.noPending')}
            description={t('admin.testimonialsPage.pendingHint')}
          />
        ) : (
          <div className="space-y-3">
            {pending.map((row) => (
              <ReviewCard
                key={row.id}
                row={row}
                busy={busyId === row.id}
                onApprove={() => handleApprove(row)}
                onDelete={() => handleDelete(row)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="section-label mb-3">{t('admin.testimonialsPage.published', { count: published.length })}</p>
        {published.length === 0 ? (
          <EmptyState title={t('admin.testimonialsPage.noPublished')} />
        ) : (
          <div className="space-y-3">
            {published.map((row) => (
              <ReviewCard
                key={row.id}
                row={row}
                busy={busyId === row.id}
                onHide={() => handleHide(row)}
                onDelete={() => handleDelete(row)}
                published
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewCard({ row, busy, onApprove, onHide, onDelete, published = false }) {
  const { t } = useTranslation();

  return (
    <article className="glass-panel p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Stars rating={row.rating} />
            <span className="font-mono text-sm font-semibold">{row.name}</span>
            {row.role && (
              <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {row.role}
              </span>
            )}
            {row.publicSubmission && (
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  color: published ? 'var(--color-success)' : 'var(--color-warning)',
                  background: `color-mix(in srgb, ${published ? 'var(--color-success)' : 'var(--color-warning)'} 12%, transparent)`,
                }}
              >
                {published ? t('admin.testimonialsPage.badgePublic') : t('admin.testimonialsPage.badgePending')}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            &ldquo;{row.quote}&rdquo;
          </p>
          {row.createdAt && (
            <p className="font-mono text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {new Date(row.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {!published && onApprove && (
            <Button size="sm" loading={busy} onClick={onApprove}>
              {t('admin.testimonialsPage.approve')}
            </Button>
          )}
          {published && onHide && (
            <Button size="sm" variant="ghost" loading={busy} onClick={onHide}>
              {t('admin.testimonialsPage.hide')}
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              loading={busy}
              onClick={onDelete}
              className={cn('text-[var(--color-danger)]')}
            >
              {t('admin.testimonialsPage.delete')}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
