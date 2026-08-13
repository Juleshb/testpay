import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getWithdrawOptions,
  getWithdrawBalance,
  requestWithdrawal,
  getWithdrawHistory,
  saveWithdrawWallet,
  clearSavedWithdrawWallet,
  explorerTxUrl,
} from '../withdrawalsApi';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../lib/cn';

function StepBadge({ n, active, done }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-full font-mono text-xs font-bold shrink-0 border',
        done && 'border-[var(--color-success)] text-[var(--color-success)]',
        active && !done && 'border-[var(--color-accent)] text-[var(--color-accent)]',
        !active && !done && 'border-[var(--color-border)] text-[var(--color-text-muted)]'
      )}
      style={
        done
          ? { background: 'color-mix(in srgb, var(--color-success) 12%, transparent)' }
          : active
            ? { background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }
            : { background: 'var(--color-surface-700)' }
      }
    >
      {done ? '✓' : n}
    </span>
  );
}

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const colors = {
    PENDING: 'var(--color-warning)',
    PROCESSING: 'var(--color-info)',
    COMPLETED: 'var(--color-success)',
    FAILED: 'var(--color-danger)',
    CANCELLED: 'var(--color-danger)',
  };
  const color = colors[status] || 'var(--color-text-muted)';
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {t(`status.${status.toLowerCase()}`)}
    </span>
  );
}

function formatTime(date) {
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WithdrawPage() {
  const { t } = useTranslation();
  const [options, setOptions] = useState(null);
  const [balance, setBalance] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chainId, setChainId] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [savedWallet, setSavedWallet] = useState(null);
  const [savingWallet, setSavingWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const initialWalletApplied = useRef(false);

  const withdrawOptions = useMemo(() => t('withdraw.options', { returnObjects: true }), [t]);

  const load = useCallback(async () => {
    try {
      const [opts, bal, history] = await Promise.all([
        getWithdrawOptions(),
        getWithdrawBalance(),
        getWithdrawHistory(),
      ]);
      setOptions(opts);
      setBalance(bal);
      setWithdrawals(history.withdrawals);
      const saved = bal.savedWallet || null;
      setSavedWallet(saved);

      if (!initialWalletApplied.current) {
        if (saved?.chainId && opts.networks.some((n) => n.chainId === saved.chainId)) {
          setChainId(String(saved.chainId));
        } else {
          const preferred =
            opts.networks.find((n) => n.chainId === opts.defaultChainId) || opts.networks[0];
          setChainId(preferred ? String(preferred.chainId) : '');
        }

        if (saved?.tokenSymbol) {
          setTokenSymbol(saved.tokenSymbol);
        } else {
          const preferred =
            opts.networks.find((n) => n.chainId === opts.defaultChainId) || opts.networks[0];
          if (preferred?.tokens.some((tok) => tok.symbol === opts.defaultToken)) {
            setTokenSymbol(opts.defaultToken);
          } else {
            setTokenSymbol(preferred?.tokens[0]?.symbol || 'USDC');
          }
        }

        setAddress(saved?.destinationAddress || '');
        initialWalletApplied.current = true;
      }
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const selectedNetwork = useMemo(
    () => options?.networks.find((n) => n.chainId === parseInt(chainId, 10)),
    [options, chainId]
  );

  const availableTokens = selectedNetwork?.tokens || [];
  const amountNum = parseFloat(amount) || 0;
  const availableUsd = parseFloat(balance?.availableUsd || '0');
  const minUsd = options?.minWithdrawUsd ?? 5;
  const maxUsd = Math.min(options?.maxWithdrawUsd ?? 50000, availableUsd);

  const networkOk = Boolean(selectedNetwork);
  const tokenOk = availableTokens.some((tok) => tok.symbol === tokenSymbol);
  const amountOk = amountNum >= minUsd && amountNum <= maxUsd;
  const addressOk = /^0x[a-fA-F0-9]{40}$/.test(address.trim());
  const canSubmit = networkOk && tokenOk && amountOk && addressOk && !submitting;
  const addressMatchesSaved =
    savedWallet?.destinationAddress &&
    address.trim().toLowerCase() === savedWallet.destinationAddress.toLowerCase();

  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed) setAddress(trimmed);
    } catch {
      setError(t('withdraw.pasteError'));
    }
  };

  const handleUseSavedWallet = () => {
    if (!savedWallet?.destinationAddress) return;
    setAddress(savedWallet.destinationAddress);
    if (savedWallet.chainId) setChainId(String(savedWallet.chainId));
    if (savedWallet.tokenSymbol) setTokenSymbol(savedWallet.tokenSymbol);
  };

  const handleSaveWallet = async () => {
    if (!addressOk) return;
    setSavingWallet(true);
    setError('');
    try {
      const wallet = await saveWithdrawWallet({
        destinationAddress: address.trim(),
        chainId: parseInt(chainId, 10),
        tokenSymbol,
      });
      setSavedWallet(wallet);
      setSuccess(t('withdraw.walletSaved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingWallet(false);
    }
  };

  const handleClearSavedWallet = async () => {
    setSavingWallet(true);
    setError('');
    try {
      await clearSavedWithdrawWallet();
      setSavedWallet(null);
      setSuccess(t('withdraw.walletRemoved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingWallet(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const result = await requestWithdrawal({
        amountUsd: amountNum.toFixed(2),
        chainId: parseInt(chainId, 10),
        tokenSymbol,
        destinationAddress: address.trim(),
      });
      setBalance(result.balance);
      setSavedWallet(result.balance?.savedWallet || {
        destinationAddress: address.trim(),
        chainId: parseInt(chainId, 10),
        tokenSymbol,
      });
      setSuccess(
        t('withdraw.queuedSuccess', {
          amountUsd: result.withdrawal.amountUsd,
          tokenAmount: result.withdrawal.tokenAmount,
          tokenSymbol: result.withdrawal.tokenSymbol,
          networkName: result.withdrawal.networkName,
        })
      );
      setAmount('');
      const history = await getWithdrawHistory();
      setWithdrawals(history.withdrawals);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !options) return <PageLoader message={t('pageCommon.loading.withdraw')} />;

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={t('withdraw.title')}
        label={t('withdraw.label')}
        description={t('withdraw.description')}
        actions={
          <div className="flex gap-2">
            <Link to="/transfer">
              <Button variant="ghost" size="md">
                {t('withdraw.transfer')}
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="md">
                {t('withdraw.dashboard')}
              </Button>
            </Link>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 space-y-6">
          <div
            className="glass-panel p-6 sm:p-8 border text-center"
            style={{ borderColor: 'var(--color-glass-border)' }}
          >
            <p className="section-label mb-2">{t('withdraw.availableToWithdraw')}</p>
            <p className="font-display text-4xl sm:text-5xl font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
              ${balance?.availableUsd ?? '0.00'}
            </p>
            <p className="font-mono text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('withdraw.minMax', { min: minUsd.toFixed(2), max: maxUsd.toFixed(2) })}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="glass-panel border overflow-hidden"
            style={{ borderColor: 'var(--color-glass-border)' }}
          >
            <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-semibold">{t('withdraw.withdrawToWallet')}</h2>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {t('withdraw.formHint')}
              </p>
            </div>

            <div className="p-6 space-y-8">
              {/* Step 1: Network */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <StepBadge n={1} active={!networkOk} done={networkOk} />
                  <div>
                    <p className="font-semibold">{t('withdraw.step1Title')}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('withdraw.step1Hint')}
                    </p>
                  </div>
                </div>
                <div className="ml-0 sm:ml-10 grid sm:grid-cols-2 gap-2">
                  {options?.networks.map((network) => {
                    const active = chainId === String(network.chainId);
                    return (
                      <button
                        key={network.chainId}
                        type="button"
                        onClick={() => {
                          setChainId(String(network.chainId));
                          const tokens = network.tokens;
                          if (!tokens.some((tok) => tok.symbol === tokenSymbol)) {
                            setTokenSymbol(tokens[0]?.symbol || 'USDC');
                          }
                        }}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-colors',
                          active ? 'border-[var(--color-accent)]' : 'hover:bg-white/[0.03]'
                        )}
                        style={
                          active
                            ? { background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)' }
                            : { borderColor: 'var(--color-border)' }
                        }
                      >
                        <p className="font-semibold text-sm">{network.name}</p>
                        <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {network.tokens.map((tok) => tok.symbol).join(' · ')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Step 2: Token */}
              <section className={cn('space-y-3', !networkOk && 'opacity-50 pointer-events-none')}>
                <div className="flex items-center gap-3">
                  <StepBadge n={2} active={networkOk && !tokenOk} done={tokenOk} />
                  <div>
                    <p className="font-semibold">{t('withdraw.step2Title')}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('withdraw.step2Hint')}
                    </p>
                  </div>
                </div>
                <div className="ml-0 sm:ml-10 flex flex-wrap gap-2">
                  {availableTokens.map((token) => (
                    <button
                      key={token.symbol}
                      type="button"
                      onClick={() => setTokenSymbol(token.symbol)}
                      className={cn(
                        'px-4 py-2 rounded-xl border font-mono text-sm font-semibold transition-colors',
                        tokenSymbol === token.symbol
                          ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                          : 'hover:bg-white/[0.03]'
                      )}
                      style={
                        tokenSymbol === token.symbol
                          ? { background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)' }
                          : { borderColor: 'var(--color-border)' }
                      }
                    >
                      {token.symbol}
                    </button>
                  ))}
                </div>
              </section>

              {/* Step 3: Amount */}
              <section className={cn('space-y-3', !tokenOk && 'opacity-50 pointer-events-none')}>
                <div className="flex items-center gap-3">
                  <StepBadge n={3} active={tokenOk && !amountOk} done={amountOk} />
                  <div>
                    <p className="font-semibold">{t('withdraw.step3Title')}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('withdraw.step3Hint', {
                        amount: amountNum > 0 ? amountNum.toFixed(2) : '0.00',
                        token: tokenSymbol,
                      })}
                    </p>
                  </div>
                </div>
                <div className="ml-0 sm:ml-10 space-y-2">
                  <div className="relative">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-2xl font-bold"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min={minUsd}
                      max={maxUsd}
                      className="dev-input w-full pl-10 py-4 font-mono text-2xl font-bold tabular-nums"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableUsd >= minUsd && (
                      <button
                        type="button"
                        className="font-mono text-xs px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
                        onClick={() => setAmount(Math.min(availableUsd, maxUsd).toFixed(2))}
                      >
                        {t('withdraw.withdrawAll', {
                          amount: Math.min(availableUsd, maxUsd).toFixed(2),
                        })}
                      </button>
                    )}
                  </div>
                  {amount && !amountOk && (
                    <p className="font-mono text-xs" style={{ color: 'var(--color-danger)' }}>
                      {t('withdraw.amountRangeError', {
                        min: minUsd.toFixed(2),
                        max: maxUsd.toFixed(2),
                      })}
                    </p>
                  )}
                </div>
              </section>

              {/* Step 4: Address */}
              <section className={cn('space-y-3', !amountOk && 'opacity-50 pointer-events-none')}>
                <div className="flex items-center gap-3">
                  <StepBadge n={4} active={amountOk && !addressOk} done={addressOk} />
                  <div>
                    <p className="font-semibold">{t('withdraw.step4Title')}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('withdraw.step4Hint')}
                    </p>
                  </div>
                </div>
                <div className="ml-0 sm:ml-10 space-y-2">
                  {savedWallet?.destinationAddress && !addressMatchesSaved && (
                    <button
                      type="button"
                      onClick={handleUseSavedWallet}
                      className="w-full text-left rounded-xl border p-3 transition-colors hover:bg-white/[0.03]"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <p className="font-mono text-[10px] section-label mb-1">{t('withdraw.savedWallet')}</p>
                      <p className="font-mono text-xs break-all">{savedWallet.destinationAddress}</p>
                      <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-accent)' }}>
                        {t('withdraw.tapToUseSaved')}
                      </p>
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input
                      className="dev-input flex-1 font-mono text-sm"
                      placeholder={t('withdraw.addressPlaceholder')}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="md" onClick={handlePasteAddress} className="shrink-0 px-4">
                      {t('withdraw.paste')}
                    </Button>
                  </div>
                  {addressOk && (
                    <div className="flex flex-wrap gap-2">
                      {!addressMatchesSaved && (
                        <button
                          type="button"
                          disabled={savingWallet}
                          onClick={handleSaveWallet}
                          className="font-mono text-xs px-3 py-1.5 rounded-lg border"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
                        >
                          {t('withdraw.saveWallet')}
                        </button>
                      )}
                      {addressMatchesSaved && savedWallet && (
                        <>
                          <span
                            className="inline-flex items-center font-mono text-[10px] px-2 py-1 rounded-full border"
                            style={{
                              borderColor: 'color-mix(in srgb, var(--color-success) 35%, transparent)',
                              color: 'var(--color-success)',
                            }}
                          >
                            {t('withdraw.savedForNext')}
                          </span>
                          <button
                            type="button"
                            disabled={savingWallet}
                            onClick={handleClearSavedWallet}
                            className="font-mono text-xs px-3 py-1.5 rounded-lg border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                          >
                            {t('withdraw.removeSaved')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {address && !addressOk && (
                    <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                      {t('withdraw.invalidAddress')}
                    </p>
                  )}
                </div>
              </section>

              {canSubmit && (
                <div
                  className="rounded-xl border p-5 space-y-3"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
                >
                  <p className="section-label">{t('withdraw.review')}</p>
                  <div className="grid sm:grid-cols-2 gap-3 font-mono text-sm">
                    <div>
                      <p style={{ color: 'var(--color-text-muted)' }}>{t('pageCommon.network')}</p>
                      <p className="font-semibold">{selectedNetwork?.name}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-muted)' }}>{t('withdraw.youReceive')}</p>
                      <p className="font-semibold text-[var(--color-accent)]">
                        {amountNum.toFixed(2)} {tokenSymbol}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p style={{ color: 'var(--color-text-muted)' }}>{t('withdraw.toAddress')}</p>
                      <p className="font-semibold break-all">{address.trim()}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-muted)' }}>{t('withdraw.balanceAfter')}</p>
                      <p className="font-semibold">${Math.max(0, availableUsd - amountNum).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" size="md" loading={submitting} disabled={!canSubmit} className="w-full py-3">
                {canSubmit
                  ? t('withdraw.submitReady', { amount: amountNum.toFixed(2), token: tokenSymbol })
                  : amountOk
                    ? t('withdraw.enterValidAddress')
                    : tokenOk
                      ? t('withdraw.enterValidAmount')
                      : t('withdraw.completeSteps')}
              </Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-5 border" style={{ borderColor: 'var(--color-glass-border)' }}>
            <p className="section-label mb-4">{t('withdraw.withdrawOptions')}</p>
            <ul className="space-y-3">
              {withdrawOptions.map((text) => (
                <li key={text} className="flex gap-2 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span style={{ color: 'var(--color-accent)' }}>•</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel p-5 border space-y-3" style={{ borderColor: 'var(--color-glass-border)' }}>
            <p className="section-label">{t('withdraw.balanceBreakdown')}</p>
            <div className="flex justify-between font-mono text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>{t('withdraw.totalReceived')}</span>
              <span>${balance?.totalCreditedUsd ?? '0.00'}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>{t('withdraw.totalSpent')}</span>
              <span>${balance?.totalDebitedUsd ?? '0.00'}</span>
            </div>
            <div
              className="flex justify-between font-mono text-sm pt-3 border-t font-semibold"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span>{t('withdraw.available')}</span>
              <span style={{ color: 'var(--color-accent)' }}>${balance?.availableUsd ?? '0.00'}</span>
            </div>
          </div>

          <div className="glass-panel p-5 border" style={{ borderColor: 'var(--color-glass-border)' }}>
            <p className="section-label mb-2">{t('withdraw.alsoAvailable')}</p>
            <Link to="/transfer" className="block font-mono text-sm hover:underline" style={{ color: 'var(--color-accent)' }}>
              {t('withdraw.sendToUser')}
            </Link>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="section-label">{t('withdraw.withdrawalHistory')}</p>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('withdraw.historyHint')}
            </p>
          </div>
        </div>

        {withdrawals.length === 0 ? (
          <div className="glass-panel p-10 text-center border" style={{ borderColor: 'var(--color-glass-border)' }}>
            <p className="text-3xl mb-3 opacity-40">↓</p>
            <p className="font-semibold mb-1">{t('withdraw.noWithdrawals')}</p>
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('withdraw.noWithdrawalsHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => {
              const txUrl = explorerTxUrl(w.explorer, w.txHash);
              return (
                <div
                  key={w.id}
                  className="glass-panel p-4 border"
                  style={{ borderColor: 'var(--color-glass-border)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">
                          ${w.amountUsd} → {w.tokenAmount} {w.tokenSymbol}
                        </p>
                        <StatusBadge status={w.status} />
                      </div>
                      <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {w.networkName} · {formatTime(w.createdAt)}
                      </p>
                      <p className="font-mono text-[10px] mt-1 break-all" style={{ color: 'var(--color-text-muted)' }}>
                        {w.destinationAddress}
                      </p>
                      {w.failureReason && (
                        <p className="font-mono text-xs mt-2" style={{ color: 'var(--color-danger)' }}>
                          {w.failureReason}
                          {w.status === 'FAILED' && t('withdraw.balanceRefunded')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {txUrl ? (
                        <a
                          href={txUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs underline"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          {t('withdraw.viewTx')}
                        </a>
                      ) : (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          {w.status === 'PENDING' ? t('withdraw.inQueue') : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
