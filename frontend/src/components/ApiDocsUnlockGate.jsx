import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getApiAccessToken,
  setApiAccessToken,
  clearApiAccessToken,
  registerDeveloperAccess,
  verifyDeveloperAccess,
  getDeveloperAccessPricing,
} from '../lib/apiAccess';
import Button from './ui/Button';
import Alert from './ui/Alert';
import { Label, Input } from './ui/Input';
import CopyButton from './ui/CopyButton';
import { PageLoader } from './ui/Spinner';

export default function ApiDocsUnlockGate({ children, onUnlockedChange }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    accountType: 'INDIVIDUAL',
    companyName: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refreshAccess = useCallback(async () => {
    const token = getApiAccessToken();
    if (!token) {
      setUnlocked(false);
      setRegistration(null);
      return;
    }
    try {
      const data = await verifyDeveloperAccess(token);
      setRegistration(data);
      setUnlocked(Boolean(data.unlocked));
      if (data.accessToken) setApiAccessToken(data.accessToken);
    } catch {
      setUnlocked(false);
      setRegistration(null);
    }
  }, []);

  useEffect(() => {
    onUnlockedChange?.(unlocked);
  }, [unlocked, onUnlockedChange]);

  useEffect(() => {
    Promise.all([getDeveloperAccessPricing(), refreshAccess()])
      .then(([price]) => setPricing(price))
      .finally(() => setLoading(false));
  }, [refreshAccess]);

  useEffect(() => {
    if (!registration || unlocked) return undefined;
    const interval = window.setInterval(refreshAccess, 10000);
    return () => window.clearInterval(interval);
  }, [registration, unlocked, refreshAccess]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await registerDeveloperAccess({
        name: form.name.trim(),
        email: form.email.trim(),
        accountType: form.accountType,
        companyName: form.accountType === 'COMPANY' ? form.companyName.trim() : undefined,
      });
      setApiAccessToken(data.accessToken);
      setRegistration(data);
      setUnlocked(Boolean(data.unlocked));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader message={t('docs.checkingAccess')} />;
  }

  if (unlocked) {
    return children;
  }

  const feeUsd =
    form.accountType === 'COMPANY' ? pricing?.companyUsd ?? 250 : pricing?.individualUsd ?? 100;
  const payment = registration?.payment;

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border p-5 sm:p-6"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
          background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
        }}
      >
        <p className="section-label mb-2">{t('common.apiDocs')}</p>
        <h2 className="font-semibold text-xl mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {t('docs.unlockTitle')}
        </h2>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {t('docs.unlockBody')}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}>
            <p className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-accent)' }}>
              {t('docs.individual')}
            </p>
            <p className="display-title text-2xl font-bold">${pricing?.individualUsd ?? 100}</p>
            <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('docs.soloDev')}
            </p>
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}>
            <p className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-accent)' }}>
              {t('docs.company')}
            </p>
            <p className="display-title text-2xl font-bold">${pricing?.companyUsd ?? 250}</p>
            <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('docs.teamsOrg')}
            </p>
          </div>
        </div>
      </div>

      {!registration ? (
        <form onSubmit={handleRegister} className="space-y-4 rounded-xl border p-5 sm:p-6" style={{ borderColor: 'var(--color-border)' }}>
          <p className="section-label">{t('docs.register')}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3" style={{ borderColor: form.accountType === 'INDIVIDUAL' ? 'var(--color-accent)' : 'var(--color-border)' }}>
              <input
                type="radio"
                name="accountType"
                checked={form.accountType === 'INDIVIDUAL'}
                onChange={() => setForm({ ...form, accountType: 'INDIVIDUAL' })}
              />
              <span>
                <span className="block text-sm font-semibold">{t('docs.individual')}</span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('docs.unlockFeeIndividual', { amount: pricing?.individualUsd ?? 100 })}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3" style={{ borderColor: form.accountType === 'COMPANY' ? 'var(--color-accent)' : 'var(--color-border)' }}>
              <input
                type="radio"
                name="accountType"
                checked={form.accountType === 'COMPANY'}
                onChange={() => setForm({ ...form, accountType: 'COMPANY' })}
              />
              <span>
                <span className="block text-sm font-semibold">{t('docs.company')}</span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {t('docs.unlockFeeIndividual', { amount: pricing?.companyUsd ?? 250 })}
                </span>
              </span>
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>{t('docs.name')}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('docs.namePlaceholder')}
                required
                disabled={submitting}
              />
            </div>
            <div>
              <Label>{t('auth.email')}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t('docs.emailPlaceholder')}
                required
                disabled={submitting}
              />
            </div>
          </div>

          {form.accountType === 'COMPANY' && (
            <div>
              <Label>{t('docs.companyName')}</Label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder={t('docs.companyPlaceholder')}
                required
                disabled={submitting}
              />
            </div>
          )}

          {error && <Alert>{error}</Alert>}

          <Button type="submit" loading={submitting}>
            {t('docs.continuePayment', { amount: feeUsd })}
          </Button>
        </form>
      ) : (
        <div className="space-y-4 rounded-xl border p-5 sm:p-6" style={{ borderColor: 'var(--color-border)' }}>
          <p className="section-label">{t('docs.paymentRequired')}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('docs.paymentInstructions', {
              amount: payment?.amount,
              network: payment?.networkName,
              email: registration.email,
            })}
          </p>

          <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}>
            <div>
              <p className="docs-label">{t('docs.depositAddress')}</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="docs-inline break-all">{payment?.depositAddress}</code>
                <CopyButton value={payment?.depositAddress} />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="docs-label">{t('docs.amount')}</p>
                <p>{payment?.amount} {payment?.tokenSymbol}</p>
              </div>
              <div>
                <p className="docs-label">{t('docs.network')}</p>
                <p>{payment?.networkName}</p>
              </div>
              <div>
                <p className="docs-label">{t('docs.status')}</p>
                <p>{payment?.status}</p>
              </div>
            </div>
          </div>

          <Alert variant="warning">{t('docs.waitingPayment')}</Alert>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              clearApiAccessToken();
              setRegistration(null);
            }}
          >
            {t('docs.differentEmail')}
          </Button>
        </div>
      )}

      <div className="docs-locked-preview rounded-xl border p-5 sm:p-6 relative overflow-hidden min-h-[12rem]" style={{ borderColor: 'var(--color-border)' }}>
        <div className="docs-locked-blur pointer-events-none select-none opacity-35 max-h-48 overflow-hidden">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="font-mono text-xs text-center px-4 py-2 rounded-full border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-800)' }}>
            {t('docs.docsHidden')}
          </p>
        </div>
      </div>
    </div>
  );
}
