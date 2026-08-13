import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getPackages,
  getPackageDashboard,
  investPackage,
  calcEstimatedDaily,
  getPackageEligibility,
} from '../packagesApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import AmountInput from '../components/ui/AmountInput';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../lib/cn';

export default function PackagesPage() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState([]);
  const [overview, setOverview] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState(false);
  const [activatingId, setActivatingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    Promise.all([getPackages(), getPackageDashboard()])
      .then(([pkgList, dash]) => {
        setPackages(pkgList);
        setOverview(dash.overview);
        if (!selectedPackageId && pkgList.length > 0) {
          setSelectedPackageId(pkgList[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const availableUsd = parseFloat(overview?.availableUsd || '0');

  const packagesWithEligibility = useMemo(
    () =>
      packages.map((pkg) => ({
        ...pkg,
        eligibility: getPackageEligibility(pkg, availableUsd),
      })),
    [packages, availableUsd]
  );

  const eligiblePackages = packagesWithEligibility.filter((p) => p.eligibility.eligible);
  const lockedPackages = packagesWithEligibility.filter((p) => !p.eligibility.eligible);

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const previewAmount = amount || selectedPackage?.minAmount || '0';
  const estimatedDaily =
    selectedPackage && previewAmount
      ? calcEstimatedDaily(previewAmount, selectedPackage.dailyRate)
      : '0';

  const invest = async (packageId, investAmount) => {
    setError('');
    setSuccess('');
    await investPackage({ packageId, amount: investAmount });
    setSuccess(t('packages.activatedSuccess'));
    setAmount('');
    load();
  };

  const handleInvest = async (e) => {
    e.preventDefault();
    setInvesting(true);
    try {
      await invest(selectedPackageId, amount);
    } catch (err) {
      setError(err.message);
    } finally {
      setInvesting(false);
    }
  };

  const handleActivate = async (pkg) => {
    const { suggestedAmount } = getPackageEligibility(pkg, availableUsd);
    if (!suggestedAmount) return;

    setActivatingId(pkg.id);
    setError('');
    setSuccess('');
    try {
      await invest(pkg.id, suggestedAmount);
    } catch (err) {
      setError(err.message);
    } finally {
      setActivatingId(null);
    }
  };

  const investAmount = parseFloat(amount || '0');
  const insufficientBalance = amount && investAmount > availableUsd;

  if (loading) return <PageLoader message={t('pageCommon.loading.packages')} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('packages.title')}
        label={t('packages.label')}
        description={t('packages.description')}
        actions={
          <Link to="/packages/portfolio">
            <Button variant="ghost" size="md">
              {t('packages.myPortfolio')}
            </Button>
          </Link>
        }
      />

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard
            label={t('packages.availableBalance')}
            value={`$${overview.availableUsd}`}
            color="text-[var(--color-accent)]"
          />
          <StatCard
            label={t('packages.dailyIncome')}
            value={`$${overview.dailyIncomeUsd ?? '0.0000'}`}
            color="text-[var(--color-success)]"
          />
          <StatCard label={t('packages.active')} value={overview.activeInvestments} />
          <StatCard label={t('packages.invested')} value={`$${overview.activeInvested}`} />
          <StatCard
            label={t('packages.totalEarned')}
            value={`$${parseFloat(overview.totalEarned).toFixed(4)}`}
            color="text-[var(--color-success)]"
          />
          <StatCard label={t('packages.allTimeInvested')} value={`$${overview.totalInvested}`} />
        </div>
      )}

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {eligiblePackages.length > 0 && (
        <section>
          <p className="section-label mb-4">{t('packages.eligibleForYou')}</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {eligiblePackages.map((pkg) => (
              <EligiblePackageCard
                key={pkg.id}
                pkg={pkg}
                eligibility={pkg.eligibility}
                activating={activatingId === pkg.id}
                onActivate={() => handleActivate(pkg)}
              />
            ))}
          </div>
        </section>
      )}

      {eligiblePackages.length === 0 && packages.length > 0 && (
        <div className="glass-panel p-6">
          <p className="font-mono text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            {t('packages.noPackagesBalance', { balance: availableUsd.toFixed(2) })}
          </p>
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('packages.increaseBalance')}
          </p>
          <Link to="/payments/new">
            <Button size="md">{t('packages.makePayment')}</Button>
          </Link>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="glass-panel p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('packages.noActivePackages')}
        </div>
      ) : (
        <>
          <section>
            <p className="section-label mb-4">{t('packages.allPackages')}</p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {packagesWithEligibility.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  eligibility={pkg.eligibility}
                  selected={pkg.id === selectedPackageId}
                  onSelect={() => {
                    setSelectedPackageId(pkg.id);
                    setError('');
                    setSuccess('');
                  }}
                />
              ))}
            </div>
          </section>

          {lockedPackages.length > 0 && (
            <section>
              <p className="section-label mb-4">{t('packages.needMoreBalance')}</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {lockedPackages.map((pkg) => (
                  <article
                    key={pkg.id}
                    className="glass-panel p-5 opacity-75"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: pkg.badgeColor }}
                      />
                      <span className="font-semibold text-sm">{pkg.name}</span>
                    </div>
                    <p className="font-mono text-xs" style={{ color: 'var(--color-warning)' }}>
                      {t('packages.needMore', { amount: pkg.eligibility.shortfall })}
                    </p>
                    <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {t('packages.minDaily', { min: pkg.minAmount, rate: pkg.dailyRate })}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {selectedPackage && (
            <section className="glass-panel p-6 max-w-lg">
              <p className="section-label text-[10px] mb-3">
                {t('packages.customAmount', { name: selectedPackage.name })}
              </p>
              <div
                className="mb-4 rounded-xl p-4 border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('packages.earnPerDay')}
                </p>
                <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: 'var(--color-success)' }}>
                  ${estimatedDaily}
                  <span className="text-sm font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>
                    {t('packages.perDay')}
                  </span>
                </p>
                <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {amount
                    ? t('packages.basedOnAmount', { amount, rate: selectedPackage.dailyRate })
                    : t('packages.atMinimum', { min: selectedPackage.minAmount, rate: selectedPackage.dailyRate })}
                </p>
              </div>
              <form onSubmit={handleInvest} className="space-y-4">
                <AmountInput
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  tokenSymbol="USD"
                  placeholder={selectedPackage.minAmount}
                />
                <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('packages.availableMinMax', {
                    available: overview?.availableUsd ?? '0.00',
                    min: selectedPackage.minAmount,
                  })}
                  {selectedPackage.maxAmount
                    ? t('packages.maxSuffix', { max: selectedPackage.maxAmount })
                    : ''}
                </p>
                {insufficientBalance && (
                  <Alert>
                    {t('packages.insufficientBalance', {
                      needed: investAmount.toFixed(2),
                      available: availableUsd.toFixed(2),
                    })}
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  loading={investing}
                  disabled={
                    insufficientBalance ||
                    availableUsd <= 0 ||
                    !getPackageEligibility(selectedPackage, availableUsd).eligible
                  }
                >
                  {t('packages.activateInvestment')}
                </Button>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EligiblePackageCard({ pkg, eligibility, activating, onActivate }) {
  const { t } = useTranslation();

  return (
    <article
      className="glass-panel p-5 border"
      style={{ borderColor: 'color-mix(in srgb, var(--color-success) 35%, transparent)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: pkg.badgeColor }} />
          <span className="font-semibold text-sm">{pkg.name}</span>
        </div>
        <span
          className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase shrink-0"
          style={{
            color: 'var(--color-success)',
            background: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)',
          }}
        >
          {t('packages.eligible')}
        </span>
      </div>
      <p className="font-mono text-2xl font-bold tabular-nums mb-1" style={{ color: 'var(--color-accent)' }}>
        {pkg.dailyRate}%
        <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('packages.daily')}
        </span>
      </p>
      <dl className="space-y-2 font-mono text-xs mb-4">
        <div className="flex justify-between">
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('packages.investAmount')}</dt>
          <dd>${eligibility.suggestedAmount}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('packages.dailyIncome')}</dt>
          <dd style={{ color: 'var(--color-success)' }}>
            ${eligibility.dailyIncome}
            {t('packages.perDay')}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('packages.duration')}</dt>
          <dd>{t('packages.days', { count: pkg.durationDays })}</dd>
        </div>
      </dl>
      <Button className="w-full" loading={activating} onClick={onActivate}>
        {t('packages.activate', { amount: eligibility.suggestedAmount })}
      </Button>
    </article>
  );
}

function PackageCard({ pkg, eligibility, selected, onSelect }) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'glass-panel p-5 text-left transition-all w-full',
        selected && 'border-[color-mix(in_srgb,var(--color-accent)_45%,transparent)] -translate-y-0.5',
        eligibility.eligible && 'border-[color-mix(in_srgb,var(--color-success)_25%,transparent)]'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: pkg.badgeColor }} />
          <span className="font-semibold text-sm">{pkg.name}</span>
        </div>
        {eligibility.eligible ? (
          <span
            className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
            style={{
              color: 'var(--color-success)',
              background: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
            }}
          >
            {t('packages.eligible')}
          </span>
        ) : (
          <span
            className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('packages.locked')}
          </span>
        )}
      </div>
      <p className="font-mono text-2xl font-bold tabular-nums mb-1" style={{ color: 'var(--color-accent)' }}>
        {pkg.dailyRate}%
      </p>
      <p className="font-mono text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
        {t('packages.dailyReturn', { days: pkg.durationDays })}
      </p>
      <p className="font-mono text-sm font-semibold tabular-nums mb-2" style={{ color: 'var(--color-success)' }}>
        ${pkg.minDailyIncome}
        {t('packages.perDay')}
        <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('packages.atMin')}
        </span>
      </p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {pkg.description}
      </p>
      <p className="font-mono text-[11px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
        {t('packages.fromUsd', { amount: pkg.minAmount })}
        {!eligibility.eligible && (
          <span style={{ color: 'var(--color-warning)' }}>
            {t('packages.needMoreShort', { amount: eligibility.shortfall })}
          </span>
        )}
      </p>
    </button>
  );
}
