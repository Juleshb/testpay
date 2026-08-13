import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAdminReferralSettings,
  updateAdminReferralSettings,
  listAdminReferralCommissions,
} from '../adminApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { Label, Input } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Spinner';

export default function AdminReferralsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [percent, setPercent] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [s, rows] = await Promise.all([
        getAdminReferralSettings(),
        listAdminReferralCommissions(),
      ]);
      setSettings(s);
      setPercent(s.commissionPercent);
      setCommissions(rows);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await updateAdminReferralSettings(percent);
      setPercent(updated.commissionPercent);
      setMessage(t('admin.referralsPage.rateUpdated', { percent: updated.commissionPercent }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.referralSettings')} />;

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={t('admin.referralsPage.title')}
        label={t('admin.referralsPage.label')}
        description={t('admin.referralsPage.description')}
      />

      {error && <Alert>{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {settings && (
        <section>
          <p className="section-label mb-3">{t('admin.referralsPage.overview')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label={t('admin.referralsPage.signupsWithInvite')} value={settings.stats.referralSignups} />
            <StatCard label={t('admin.referralsPage.commissionsPaid')} value={settings.stats.totalCommissions} />
            <StatCard
              label={t('admin.referralsPage.totalPaidOut')}
              value={`$${settings.stats.totalPaidUsd}`}
              color="text-[var(--color-accent)]"
              className="col-span-2 sm:col-span-1"
            />
          </div>
        </section>
      )}

      <section className="glass-panel p-4 sm:p-6 max-w-md">
        <p className="section-label mb-4">{t('admin.referralsPage.commissionRate')}</p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>{t('admin.referralsPage.firstPackageCommission')}</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              required
            />
            <p className="font-mono text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.referralsPage.commissionHint')}
            </p>
          </div>
          <Button type="submit" loading={saving}>
            {t('admin.referralsPage.saveRate')}
          </Button>
        </form>
      </section>

      <section>
        <p className="section-label mb-3">{t('admin.referralsPage.recentCommissions')}</p>
        <div className="hidden md:block glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b font-mono text-xs uppercase tracking-wider text-left"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <th className="px-4 py-3">{t('admin.referralsPage.inviter')}</th>
                  <th className="px-4 py-3">{t('admin.referralsPage.invitee')}</th>
                  <th className="px-4 py-3">{t('admin.referralsPage.packageAmount')}</th>
                  <th className="px-4 py-3">{t('admin.referralsPage.rate')}</th>
                  <th className="px-4 py-3">{t('admin.referralsPage.earned')}</th>
                  <th className="px-4 py-3">{t('pageCommon.date')}</th>
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t('admin.referralsPage.noCommissions')}
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                    >
                      <td className="px-4 py-3">{c.inviter.username ? `@${c.inviter.username}` : c.inviter.name || '—'}</td>
                      <td className="px-4 py-3">{c.invitee.username ? `@${c.invitee.username}` : c.invitee.name || '—'}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">${c.packageAmountUsd}</td>
                      <td className="px-4 py-3 font-mono">{c.commissionPercent}%</td>
                      <td className="px-4 py-3 font-mono tabular-nums" style={{ color: 'var(--color-success)' }}>
                        +${c.commissionUsd}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-3">
          {commissions.length === 0 ? (
            <div className="glass-panel p-6 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('admin.referralsPage.noCommissions')}
            </div>
          ) : (
            commissions.map((c) => (
              <article key={c.id} className="glass-panel p-4">
                <p className="font-mono text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                  +${c.commissionUsd}
                </p>
                <p className="text-sm mt-1">
                  {c.inviter.username ? `@${c.inviter.username}` : c.inviter.name} →{' '}
                  {c.invitee.username ? `@${c.invitee.username}` : c.invitee.name}
                </p>
                <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  ${c.packageAmountUsd} package · {c.commissionPercent}%
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
