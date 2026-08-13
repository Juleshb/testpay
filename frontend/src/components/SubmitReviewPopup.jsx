import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitPublicReview } from '../publicApi';
import Button from './ui/Button';
import Alert from './ui/Alert';
import { Label, Input } from './ui/Input';
import { cn } from '../lib/cn';

function StarPicker({ value, onChange, disabled, t }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={t('review.selectRating')}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className={cn('p-0.5 transition-transform', !disabled && 'hover:scale-110')}
          aria-label={star === 1 ? t('review.star', { count: star }) : t('review.stars', { count: star })}
        >
          <svg
            className="w-7 h-7"
            viewBox="0 0 20 20"
            fill={star <= value ? 'var(--color-warning)' : 'color-mix(in srgb, var(--color-text-muted) 35%, transparent)'}
            aria-hidden
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function SubmitReviewPopup({ onSubmitted }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', quote: '' });
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) setOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, loading]);

  const close = () => {
    if (loading) return;
    setOpen(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await submitPublicReview({
        name: form.name.trim(),
        role: form.role.trim() || undefined,
        quote: form.quote.trim(),
        rating,
      });
      setSuccess(result.message);
      setForm({ name: '', role: '', quote: '' });
      setRating(5);
      onSubmitted?.();
      window.setTimeout(() => {
        setOpen(false);
        setSuccess('');
      }, 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mt-8">
        <Button type="button" size="md" onClick={() => setOpen(true)}>
          {t('review.rateStackPay')}
        </Button>
        <p className="font-mono text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
          {t('review.shareExperience')}
        </p>
      </div>

      {open && (
        <div className="review-popup-backdrop" onClick={close} role="presentation">
          <section
            className="review-popup-panel glass-panel border"
            style={{ borderColor: 'var(--color-glass-border)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-popup-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="review-popup-header">
              <div>
                <p className="section-label mb-1">{t('review.dialogLabel')}</p>
                <h3 id="review-popup-title" className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                  {t('review.rateStackPay')}
                </h3>
              </div>
              <button type="button" className="review-popup-close" onClick={close} aria-label={t('review.close')}>
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit} className="review-popup-body space-y-4 text-left">
              <div>
                <Label>{t('review.yourRating')}</Label>
                <StarPicker value={rating} onChange={setRating} disabled={loading} t={t} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>{t('review.name')}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t('review.namePlaceholder')}
                    required
                    maxLength={80}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label>{t('review.role')}</Label>
                  <Input
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder={t('review.rolePlaceholder')}
                    maxLength={80}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label>{t('review.yourReview')}</Label>
                <textarea
                  value={form.quote}
                  onChange={(e) => setForm({ ...form, quote: e.target.value })}
                  placeholder={t('review.reviewPlaceholder')}
                  required
                  minLength={10}
                  maxLength={500}
                  rows={4}
                  disabled={loading}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm resize-y min-h-[6rem]"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface-700)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('review.charCount', { count: form.quote.length })}
                </p>
              </div>

              {error && <Alert>{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button type="button" variant="ghost" onClick={close} disabled={loading}>
                  {t('review.cancel')}
                </Button>
                <Button type="submit" loading={loading}>
                  {t('review.submit')}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
