import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyReferrals } from '../referralsApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import CopyButton from '../components/ui/CopyButton';
import UserAvatar from '../components/community/UserAvatar';
import { memberAvatarProps } from '../communityApi';
import { PageLoader } from '../components/ui/Spinner';

export default function ReferralsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyReferrals()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader message={t('pageCommon.loading.referrals')} />;

  if (error && !data) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="font-mono text-sm mb-4" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
        <Button size="md" onClick={() => window.location.reload()}>
          {t('pageCommon.retry')}
        </Button>
      </div>
    );
  }

  const { inviteCode, inviteLink, commissionPercent, referredBy, stats, invitedUsers, commissions } = data;

  function inviteeLabel(user) {
    return user.name || (user.username ? `@${user.username}` : t('referrals.userFallback'));
  }

  function statusLabel(status) {
    if (status === 'earned') return t('referrals.statusEarned');
    if (status === 'invested') return t('referrals.statusInvested');
    return t('referrals.statusAwaiting');
  }

  function statusColor(status) {
    if (status === 'earned') return 'var(--color-success)';
    if (status === 'invested') return 'var(--color-accent)';
    return 'var(--color-text-muted)';
  }

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6 sm:space-y-8">
      <PageHeader
        title={t('referrals.title')}
        label={t('referrals.label')}
        description={t('referrals.description', { percent: commissionPercent })}
      />

      <section className="glass-panel p-4 sm:p-6 space-y-4">
        <p className="section-label">{t('referrals.invitationCode')}</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <code
            className="font-mono text-xl sm:text-2xl font-bold tracking-widest px-4 py-3 rounded-xl border text-center sm:text-left break-all"
            style={{
              color: 'var(--color-accent)',
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface-700)',
            }}
          >
            {inviteCode}
          </code>
          <CopyButton text={inviteCode} label={t('referrals.copyCode')} />
        </div>

        <div>
          <p className="section-label text-[10px] mb-2">{t('referrals.shareLink')}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={inviteLink}
              className="dev-input flex-1 text-xs font-mono min-w-0"
            />
            <CopyButton text={inviteLink} label={t('referrals.copyLink')} />
          </div>
        </div>

        <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {t('referrals.howItWorks', { percent: commissionPercent })}
        </p>
      </section>

      {referredBy && (
        <section className="glass-panel p-4 sm:p-5">
          <p className="section-label mb-3">{t('referrals.invitedBy')}</p>
          <div className="flex items-center gap-3">
            <UserAvatar {...memberAvatarProps(referredBy)} size={44} />
            <div>
              <p className="font-semibold">
                {referredBy.name || (referredBy.username ? `@${referredBy.username}` : t('referrals.aMember'))}
              </p>
              {referredBy.inviteCode && (
                <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('referrals.codeLabel', { code: referredBy.inviteCode })}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section>
        <p className="section-label mb-3">{t('referrals.earnings')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label={t('referrals.invited')} value={stats.referralCount} />
          <StatCard label={t('referrals.paidReferrals')} value={stats.paidReferrals} color="text-[var(--color-success)]" />
          <StatCard
            label={t('referrals.totalEarned')}
            value={`$${stats.totalEarnedUsd}`}
            color="text-[var(--color-accent)]"
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </section>

      <section>
        <p className="section-label mb-3">{t('referrals.invitedUsers')}</p>
        {!invitedUsers?.length ? (
          <div className="glass-panel p-6 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('referrals.noInvitees')}
          </div>
        ) : (
          <>
            <div className="hidden sm:block glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b font-mono text-xs uppercase tracking-wider text-left"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <th className="px-4 py-3">{t('pageCommon.user')}</th>
                      <th className="px-4 py-3">{t('referrals.joined')}</th>
                      <th className="px-4 py-3">{t('pageCommon.status')}</th>
                      <th className="px-4 py-3">{t('referrals.yourEarn')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitedUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b"
                        style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar {...memberAvatarProps(u, inviteeLabel(u))} size={32} />
                            <span className="font-medium truncate max-w-[10rem]">{inviteeLabel(u)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(u.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
                            style={{
                              color: statusColor(u.status),
                              background: `color-mix(in srgb, ${statusColor(u.status)} 12%, transparent)`,
                            }}
                          >
                            {statusLabel(u.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">
                          {u.commissionUsd ? (
                            <span style={{ color: 'var(--color-success)' }}>+${u.commissionUsd}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sm:hidden space-y-3">
              {invitedUsers.map((u) => (
                <article key={u.id} className="glass-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <UserAvatar {...memberAvatarProps(u, inviteeLabel(u))} size={40} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{inviteeLabel(u)}</p>
                        <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {t('referrals.joined')} {new Date(u.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {u.commissionUsd ? (
                      <p className="font-mono font-bold tabular-nums shrink-0" style={{ color: 'var(--color-success)' }}>
                        +${u.commissionUsd}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className="font-mono text-[10px] mt-2 uppercase tracking-wide"
                    style={{ color: statusColor(u.status) }}
                  >
                    {statusLabel(u.status)}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section>
        <p className="section-label mb-3">{t('referrals.commissionHistory')}</p>
        {commissions.length === 0 ? (
          <div className="glass-panel p-6 text-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('referrals.noCommissions')}
          </div>
        ) : (
          <div className="space-y-3">
            {commissions.map((c) => (
              <article key={c.id} className="glass-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {c.invitee.name || (c.invitee.username ? `@${c.invitee.username}` : t('referrals.userFallback'))}
                    </p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {t('referrals.firstPackage', {
                        amount: c.packageAmountUsd,
                        percent: c.commissionPercent,
                      })}
                    </p>
                  </div>
                  <p className="font-mono font-bold tabular-nums shrink-0" style={{ color: 'var(--color-success)' }}>
                    +${c.commissionUsd}
                  </p>
                </div>
                <p className="font-mono text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
