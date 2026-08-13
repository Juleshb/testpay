import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLoanDashboard, applyForLoan } from '../loansApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../lib/cn';

export default function LoanPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    getLoanDashboard()
      .then((dash) => {
        setData(dash);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApply = async () => {
    setError('');
    setSuccess('');
    if (!acceptTerms) {
      setError(t('loans.acceptTermsError'));
      return;
    }
    setApplying(true);
    try {
      const result = await applyForLoan(true);
      setData((prev) => ({
        ...prev,
        eligibility: result.eligibility,
        balance: result.balance,
        loans: result.loan ? [result.loan, ...(prev?.loans || [])] : prev?.loans,
      }));
      setSuccess(t('loans.approvedSuccess', { amount: result.loan?.principalUsd }));
      setAcceptTerms(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading && !data) return <PageLoader message={t('pageCommon.loading.loan')} />;

  const { eligibility, balance, loans } = data || {};
  const activeLoan = eligibility?.activeLoan || loans?.find((l) => l.status === 'ACTIVE');
  const { offer, terms, checks, qualifiedReferrals } = eligibility || {};

  function loanStatusLabel(status) {
    if (status === 'PAID') return t('loans.statusPaid');
    if (status === 'ACTIVE') return t('loans.statusActive');
    return status;
  }

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6 sm:space-y-8">
      <PageHeader
        title={t('loans.title')}
        label={t('loans.label')}
        description={t('loans.description')}
        actions={
          <Link to="/packages/portfolio">
            <Button variant="ghost" size="md">
              {t('loans.portfolio')}
            </Button>
          </Link>
        }
      />

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {activeLoan ? (
        <section className="glass-panel p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label">{t('loans.activeLoan')}</p>
              <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums mt-1" style={{ color: 'var(--color-accent)' }}>
                ${activeLoan.remainingUsd}
              </p>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {t('loans.remainingOf', { total: activeLoan.totalOwedUsd })}
              </p>
            </div>
            <span
              className="font-mono text-[10px] px-2 py-1 rounded-full uppercase shrink-0"
              style={{
                color: 'var(--color-warning)',
                background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
              }}
            >
              {loanStatusLabel(activeLoan.status)}
            </span>
          </div>

          <div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-700)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${activeLoan.progressPercent}%`,
                  background: 'var(--color-accent)',
                }}
              />
            </div>
            <p className="font-mono text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {t('loans.repaidProgress', {
                percent: activeLoan.progressPercent,
                paid: activeLoan.paidUsd,
              })}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div>
              <dt style={{ color: 'var(--color-text-muted)' }}>{t('loans.principal')}</dt>
              <dd>${activeLoan.principalUsd}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-text-muted)' }}>
                {t('loans.interest', { rate: activeLoan.interestRate })}
              </dt>
              <dd>${activeLoan.interestUsd}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-text-muted)' }}>{t('loans.basedOnInvestment')}</dt>
              <dd>${activeLoan.investmentBaseUsd}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-text-muted)' }}>{t('loans.disbursed')}</dt>
              <dd>{new Date(activeLoan.disbursedAt).toLocaleDateString()}</dd>
            </div>
          </dl>

          <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('loans.earningsApplied')}
          </p>
        </section>
      ) : (
        <>
          <section>
            <p className="section-label mb-3">{t('loans.loanOffer')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard
                label={t('loans.canBorrow')}
                value={`$${offer?.principalUsd ?? '0.00'}`}
                color="text-[var(--color-accent)]"
              />
              <StatCard label={t('loans.interest25')} value={`$${offer?.interestUsd ?? '0.00'}`} />
              <StatCard
                label={t('loans.totalToRepay')}
                value={`$${offer?.totalOwedUsd ?? '0.00'}`}
                className="col-span-2 sm:col-span-1"
              />
            </div>
            <p className="font-mono text-[11px] mt-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('loans.offerDetail', {
                principalPercent: terms?.principalPercent,
                investment: eligibility?.investmentBaseUsd ?? '0.00',
                interestPercent: terms?.interestPercent,
              })}
            </p>
          </section>

          <section className="glass-panel p-4 sm:p-6 space-y-4">
            <p className="section-label">{t('loans.eligibility')}</p>
            <ul className="space-y-3">
              {checks?.map((check) => (
                <li key={check.id} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      check.met ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'
                    )}
                    style={{
                      background: check.met
                        ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                        : 'var(--color-surface-700)',
                    }}
                  >
                    {check.met ? '✓' : '·'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{check.label}</p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {check.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-panel p-4 sm:p-6 space-y-3">
            <p className="section-label">
              {t('loans.qualifiedInvitees', { count: eligibility?.qualifiedReferralCount ?? 0 })}
            </p>
            {!qualifiedReferrals?.length ? (
              <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('loans.noInvitees')}
              </p>
            ) : (
              <div className="space-y-2">
                {qualifiedReferrals.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
                    style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
                  >
                    <span className="text-sm truncate">{r.label}</span>
                    <span
                      className="font-mono text-[10px] px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        color: r.qualified ? 'var(--color-success)' : 'var(--color-text-muted)',
                        background: r.qualified
                          ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
                          : 'var(--color-surface-700)',
                      }}
                    >
                      {r.qualified ? t('loans.hasPackage') : t('loans.noPackage')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {eligibility?.eligible && (
            <section className="glass-panel p-4 sm:p-6 space-y-4">
              <p className="section-label">{t('loans.terms')}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {t('loans.termsBody', {
                  interestPercent: terms?.interestPercent,
                  totalOwed: offer?.totalOwedUsd,
                  principal: offer?.principalUsd,
                })}
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded"
                />
                <span className="text-sm">{t('loans.acceptCheckbox')}</span>
              </label>
              <Button
                className="w-full sm:w-auto"
                onClick={handleApply}
                loading={applying}
                disabled={!acceptTerms}
              >
                {t('loans.applyFor', { amount: offer?.principalUsd })}
              </Button>
              <p className="font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {t('loans.balanceAfterApproval', {
                  before: balance?.availableUsd ?? '0.00',
                  after: (
                    parseFloat(balance?.availableUsd || 0) + parseFloat(offer?.principalUsd || 0)
                  ).toFixed(2),
                })}
              </p>
            </section>
          )}
        </>
      )}

      {loans?.length > 0 && (
        <section>
          <p className="section-label mb-3">{t('loans.loanHistory')}</p>
          <div className="space-y-3">
            {loans.map((loan) => (
              <article key={loan.id} className="glass-panel p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-mono font-semibold tabular-nums">
                      {t('loans.borrowed', { amount: loan.principalUsd })}
                    </p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {t('loans.repayDetail', {
                        total: loan.totalOwedUsd,
                        date: new Date(loan.disbursedAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                  <span
                    className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
                    style={{
                      color: loan.status === 'PAID' ? 'var(--color-success)' : 'var(--color-warning)',
                      background:
                        loan.status === 'PAID'
                          ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
                          : 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
                    }}
                  >
                    {loanStatusLabel(loan.status)}
                  </span>
                </div>
                {loan.repayments?.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="section-label text-[10px]">{t('loans.recentRepayments')}</p>
                    {loan.repayments.slice(0, 5).map((r) => (
                      <p key={r.id} className="font-mono text-xs flex justify-between gap-2">
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(r.accrualDate).toLocaleDateString()}
                        </span>
                        <span style={{ color: 'var(--color-success)' }}>-${parseFloat(r.amountUsd).toFixed(4)}</span>
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
