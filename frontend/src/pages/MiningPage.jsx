import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getMiningOptions,
  getMiningDashboard,
  startMining,
  calcEstimatedDaily,
  getMiningEligibility,
} from '../miningApi';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import AmountInput from '../components/ui/AmountInput';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../lib/cn';
import LiveMiningPanel from '../components/LiveMiningPanel';

function depositUrl(amount) {
  const usd = parseFloat(amount);
  if (!Number.isFinite(usd) || usd <= 0) return '/payments/new';
  return `/payments/new?amount=${encodeURIComponent(usd.toFixed(2))}`;
}

export default function MiningPage() {
  const { t } = useTranslation();
  const [options, setOptions] = useState([]);
  const [overview, setOverview] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activatingId, setActivatingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    Promise.all([getMiningOptions(), getMiningDashboard()])
      .then(([list, dash]) => {
        setOptions(list);
        setOverview(dash.overview);
        setPositions(dash.positions || []);
        if (!selectedOptionId && list.length > 0) {
          setSelectedOptionId(list[0].id);
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
  const activePositions = useMemo(
    () => (positions || []).filter((p) => p.status === 'ACTIVE'),
    [positions]
  );
  const activeOptionIds = useMemo(
    () => new Set(activePositions.map((p) => p.option?.id).filter(Boolean)),
    [activePositions]
  );
  const hasActiveFree = activePositions.some((p) => p.option?.isFree);

  const optionsWithEligibility = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        eligibility: getMiningEligibility(option, availableUsd),
        alreadyRunning: activeOptionIds.has(option.id),
      })),
    [options, availableUsd, activeOptionIds]
  );

  const eligibleOptions = optionsWithEligibility.filter((o) => o.eligibility.eligible);
  const lockedOptions = optionsWithEligibility.filter((o) => !o.eligibility.eligible);

  const selectedOption = options.find((o) => o.id === selectedOptionId);
  const previewAmount = selectedOption?.isFree
    ? selectedOption.minAmount
    : amount || selectedOption?.minAmount || '0';
  const estimatedDaily =
    selectedOption && previewAmount
      ? calcEstimatedDaily(previewAmount, selectedOption.dailyRate)
      : '0';

  const start = async (optionId, investAmount) => {
    setError('');
    setSuccess('');
    await startMining({ optionId, amount: investAmount });
    setSuccess(t('mining.startedSuccess'));
    setAmount('');
    load();
  };

  const handleStart = async (e) => {
    e.preventDefault();
    setStarting(true);
    try {
      const amt = selectedOption?.isFree ? selectedOption.minAmount : amount;
      await start(selectedOptionId, amt);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleActivate = async (option) => {
    const { suggestedAmount } = getMiningEligibility(option, availableUsd);
    if (!suggestedAmount) return;

    setActivatingId(option.id);
    setError('');
    setSuccess('');
    try {
      await start(option.id, suggestedAmount);
    } catch (err) {
      setError(err.message);
    } finally {
      setActivatingId(null);
    }
  };

  const investAmount = parseFloat(amount || '0');
  const insufficientBalance = amount && investAmount > availableUsd;
  const selectedEligibility = selectedOption
    ? getMiningEligibility(selectedOption, availableUsd)
    : null;

  if (loading) return <PageLoader message={t('pageCommon.loading.mining')} />;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('mining.title')}
        label={t('mining.label')}
        description={t('mining.description')}
        actions={
          <Link to="/mining/portfolio">
            <Button variant="ghost" size="md">
              {t('mining.myMiners')}
            </Button>
          </Link>
        }
      />

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard
            label={t('mining.availableBalance')}
            value={`$${overview.availableUsd}`}
            hint={t('mining.availableHint')}
            color="text-[var(--color-accent)]"
          />
          <StatCard
            label={t('mining.miningBalance')}
            value={`$${parseFloat(overview.miningBalanceUsd || overview.totalEarned || '0').toFixed(4)}`}
            hint={t('mining.miningBalanceHint')}
            color="text-[var(--color-success)]"
          />
          <StatCard
            label={t('mining.dailyIncome')}
            value={`$${overview.dailyIncomeUsd ?? '0.0000'}`}
            color="text-[var(--color-success)]"
          />
          <StatCard label={t('mining.active')} value={overview.activePositions} />
          <StatCard label={t('mining.allocated')} value={`$${overview.activeInvested}`} />
          <StatCard label={t('mining.allTimeAllocated')} value={`$${overview.totalInvested}`} />
        </div>
      )}

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {activePositions.length > 0 && <LiveMiningPanel positions={activePositions} />}

      {eligibleOptions.length > 0 && (
        <section>
          <p className="section-label mb-4">{t('mining.eligibleForYou')}</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {eligibleOptions.map((option) => (
              <EligibleMiningCard
                key={option.id}
                option={option}
                eligibility={option.eligibility}
                alreadyRunning={option.alreadyRunning || (option.isFree && hasActiveFree)}
                activating={activatingId === option.id}
                onActivate={() => handleActivate(option)}
              />
            ))}
          </div>
        </section>
      )}

      {eligibleOptions.length === 0 && options.length > 0 && (
        <div className="glass-panel p-6">
          <p className="font-mono text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            {t('mining.noOptionsBalance', { balance: availableUsd.toFixed(2) })}
          </p>
          <p className="font-mono text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('mining.increaseBalance')}
          </p>
          <Link to={depositUrl(lockedOptions[0]?.eligibility?.shortfall || options[0]?.minAmount)}>
            <Button size="md">{t('mining.makePayment')}</Button>
          </Link>
        </div>
      )}

      {options.length === 0 ? (
        <div className="glass-panel p-8 text-center font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('mining.noActiveOptions')}
        </div>
      ) : (
        <>
          <section>
            <p className="section-label mb-4">{t('mining.allOptions')}</p>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {optionsWithEligibility.map((option) => (
                <MiningCard
                  key={option.id}
                  option={option}
                  eligibility={option.eligibility}
                  selected={option.id === selectedOptionId}
                  onSelect={() => {
                    setSelectedOptionId(option.id);
                    setError('');
                    setSuccess('');
                  }}
                />
              ))}
            </div>
          </section>

          {lockedOptions.length > 0 && (
            <section>
              <p className="section-label mb-4">{t('mining.needMoreBalance')}</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {lockedOptions.map((option) => (
                  <article key={option.id} className="glass-panel p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: option.badgeColor }}
                      />
                      <span className="font-semibold text-sm">{option.name}</span>
                    </div>
                    <p className="font-mono text-xs" style={{ color: 'var(--color-warning)' }}>
                      {t('mining.needMore', { amount: option.eligibility.shortfall })}
                    </p>
                    <p className="font-mono text-[11px] mt-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>
                      {t('mining.hashRateCoin', { hashRate: option.hashRate, coin: option.coin })}
                    </p>
                    <Link to={depositUrl(option.eligibility.shortfall)} className="block">
                      <Button className="w-full" size="md">
                        {t('mining.unlock', { amount: option.eligibility.shortfall })}
                      </Button>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          {selectedOption && (
            <section className="glass-panel p-6 max-w-lg">
              <p className="section-label text-[10px] mb-3">
                {selectedOption.isFree
                  ? t('mining.freePlan', { name: selectedOption.name })
                  : t('mining.customAmount', { name: selectedOption.name })}
              </p>
              <div
                className="mb-4 rounded-xl p-4 border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('mining.earnPerDay')}
                </p>
                <p className="font-mono text-2xl font-bold tabular-nums" style={{ color: 'var(--color-success)' }}>
                  ${estimatedDaily}
                  <span className="text-sm font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>
                    {t('mining.perDay')}
                  </span>
                </p>
                <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('mining.hashRateCoin', {
                    hashRate: selectedOption.hashRate,
                    coin: selectedOption.coin,
                  })}
                </p>
              </div>
              <form onSubmit={handleStart} className="space-y-4">
                {!selectedOption.isFree && (
                  <>
                    <AmountInput
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      tokenSymbol="USD"
                      placeholder={selectedOption.minAmount}
                    />
                    <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t('mining.availableMinMax', {
                        available: overview?.availableUsd ?? '0.00',
                        min: selectedOption.minAmount,
                      })}
                      {selectedOption.maxAmount
                        ? t('mining.maxSuffix', { max: selectedOption.maxAmount })
                        : ''}
                    </p>
                    {insufficientBalance && (
                      <Alert>
                        {t('mining.insufficientBalance', {
                          needed: investAmount.toFixed(2),
                          available: availableUsd.toFixed(2),
                        })}
                      </Alert>
                    )}
                  </>
                )}
                {selectedOption.isFree && (
                  <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {t('mining.freeHint', { amount: selectedOption.minAmount, days: selectedOption.durationDays })}
                  </p>
                )}
                {!selectedOption.isFree && !selectedEligibility?.eligible ? (
                  <Link to={depositUrl(selectedEligibility?.shortfall)} className="block">
                    <Button type="button" className="w-full">
                      {t('mining.unlock', { amount: selectedEligibility?.shortfall })}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    type="submit"
                    className="w-full"
                    loading={starting}
                    disabled={
                      selectedOption.isFree
                        ? hasActiveFree
                        : insufficientBalance || availableUsd <= 0
                    }
                  >
                    {selectedOption.isFree
                      ? hasActiveFree
                        ? t('mining.alreadyRunning')
                        : t('mining.startFree')
                      : t('mining.startMining')}
                  </Button>
                )}
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EligibleMiningCard({ option, eligibility, alreadyRunning, activating, onActivate }) {
  const { t } = useTranslation();

  return (
    <article
      className="glass-panel p-5 border"
      style={{
        borderColor: alreadyRunning
          ? 'color-mix(in srgb, var(--color-success) 45%, transparent)'
          : 'color-mix(in srgb, var(--color-success) 35%, transparent)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: option.badgeColor }} />
          <span className="font-semibold text-sm">{option.name}</span>
        </div>
        <span
          className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase shrink-0"
          style={{
            color: alreadyRunning
              ? 'var(--color-success)'
              : option.isFree
                ? 'var(--color-accent)'
                : 'var(--color-success)',
            background: alreadyRunning
              ? 'color-mix(in srgb, var(--color-success) 14%, transparent)'
              : option.isFree
                ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                : 'color-mix(in srgb, var(--color-success) 12%, transparent)',
            border: alreadyRunning
              ? '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)'
              : option.isFree
                ? '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)'
                : '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)',
          }}
        >
          {alreadyRunning
            ? t('mining.statusStarted')
            : option.isFree
              ? t('mining.free')
              : t('mining.eligible')}
        </span>
      </div>
      <p className="font-mono text-2xl font-bold tabular-nums mb-1" style={{ color: 'var(--color-accent)' }}>
        {option.dailyRate}%
        <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('mining.daily')}
        </span>
      </p>
      <dl className="space-y-2 font-mono text-xs mb-4">
        <div className="flex justify-between">
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('mining.hashRate')}</dt>
          <dd>{option.hashRate}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('mining.coin')}</dt>
          <dd>{option.coin}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('mining.allocateAmount')}</dt>
          <dd>${eligibility.suggestedAmount}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('mining.dailyIncome')}</dt>
          <dd style={{ color: 'var(--color-success)' }}>
            ${eligibility.dailyIncome}
            {t('mining.perDay')}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: 'var(--color-text-muted)' }}>{t('mining.duration')}</dt>
          <dd>{t('mining.days', { count: option.durationDays })}</dd>
        </div>
      </dl>
      {alreadyRunning ? (
        <Link to="/mining/portfolio" className="block">
          <Button className="w-full" variant="ghost">
            {t('mining.viewRunning')}
          </Button>
        </Link>
      ) : (
        <Button className="w-full" loading={activating} onClick={onActivate}>
          {option.isFree
            ? t('mining.startFree')
            : t('mining.activate', { amount: eligibility.suggestedAmount })}
        </Button>
      )}
    </article>
  );
}

function MiningCard({ option, eligibility, selected, onSelect }) {
  const { t } = useTranslation();

  return (
    <article
      className={cn(
        'glass-panel p-5 text-left transition-all w-full',
        selected && 'border-[color-mix(in_srgb,var(--color-accent)_45%,transparent)] -translate-y-0.5',
        eligibility.eligible && 'border-[color-mix(in_srgb,var(--color-success)_25%,transparent)]'
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: option.badgeColor }} />
            <span className="font-semibold text-sm">{option.name}</span>
          </div>
          {option.isFree ? (
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
              style={{
                color: 'var(--color-accent)',
                background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
              }}
            >
              {t('mining.free')}
            </span>
          ) : eligibility.eligible ? (
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
              style={{
                color: 'var(--color-success)',
                background: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
              }}
            >
              {t('mining.eligible')}
            </span>
          ) : (
            <span
              className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('mining.locked')}
            </span>
          )}
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums mb-1" style={{ color: 'var(--color-accent)' }}>
          {option.dailyRate}%
        </p>
        <p className="font-mono text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {t('mining.hashRateCoin', { hashRate: option.hashRate, coin: option.coin })}
        </p>
        <p className="font-mono text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {t('mining.dailyReturn', { days: option.durationDays })}
        </p>
        <p className="font-mono text-sm font-semibold tabular-nums mb-2" style={{ color: 'var(--color-success)' }}>
          ${option.minDailyIncome}
          {t('mining.perDay')}
          <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('mining.atMin')}
          </span>
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {option.description}
        </p>
        <p className="font-mono text-[11px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
          {option.isFree
            ? t('mining.freeFromUsd', { amount: option.minAmount })
            : t('mining.fromUsd', { amount: option.minAmount })}
          {!option.isFree && !eligibility.eligible && (
            <span style={{ color: 'var(--color-warning)' }}>
              {t('mining.needMoreShort', { amount: eligibility.shortfall })}
            </span>
          )}
        </p>
      </button>
      {!option.isFree && !eligibility.eligible && (
        <Link to={depositUrl(eligibility.shortfall)} className="block mt-3">
          <Button type="button" className="w-full" size="md">
            {t('mining.unlock', { amount: eligibility.shortfall })}
          </Button>
        </Link>
      )}
    </article>
  );
}
