import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import {
  getTransferBalance,
  lookupTransferRecipient,
  sendTransfer,
  getTransferHistory,
} from '../transfersApi';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../lib/cn';

function formatTime(date) {
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

export default function TransferPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const howSteps = useMemo(() => t('transfer.howSteps', { returnObjects: true }), [t]);

  const load = useCallback(async () => {
    try {
      const [bal, history] = await Promise.all([getTransferBalance(), getTransferHistory()]);
      setBalance(bal);
      setTransfers(history.transfers);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLookup = async () => {
    const id = recipient.trim();
    if (!id) return;
    setLookingUp(true);
    setError('');
    setRecipientPreview(null);
    try {
      const found = await lookupTransferRecipient(id);
      setRecipientPreview(found);
    } catch (err) {
      setError(err.message);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!recipientPreview || !amount.trim() || sending) return;

    setSending(true);
    setError('');
    setSuccess('');
    try {
      const result = await sendTransfer({
        recipient: recipient.trim(),
        amountUsd: amount.trim(),
        note: note.trim() || undefined,
      });
      setBalance(result.balance);
      setSuccess(
        t('transfer.successMessage', {
          amount: result.transfer.amountUsd,
          label: result.transfer.counterparty.label,
        })
      );
      setRecipient('');
      setAmount('');
      setNote('');
      setRecipientPreview(null);
      const history = await getTransferHistory();
      setTransfers(history.transfers);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const copyUsername = async () => {
    if (!user?.username) return;
    await navigator.clipboard.writeText(`@${user.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const availableUsd = parseFloat(balance?.availableUsd || '0');
  const amountNum = parseFloat(amount) || 0;
  const balanceAfter = availableUsd - amountNum;
  const recipientOk = Boolean(recipientPreview);
  const amountOk = amountNum > 0 && amountNum <= availableUsd;
  const canSend = recipientOk && amountOk && !sending;

  if (loading && !balance) return <PageLoader message={t('pageCommon.loading.transfer')} />;

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={t('transfer.title')}
        label={t('transfer.label')}
        description={t('transfer.description')}
        actions={
          <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
            <Link to="/withdraw" className="w-full sm:w-auto">
              <Button variant="ghost" size="md" className="w-full">
                {t('transfer.withdraw')}
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="ghost" size="md" className="w-full">
                {t('transfer.dashboard')}
              </Button>
            </Link>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* Main column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Balance hero */}
          <div
            className="glass-panel p-6 sm:p-8 border text-center"
            style={{ borderColor: 'var(--color-glass-border)' }}
          >
            <p className="section-label mb-2">{t('transfer.availableToSend')}</p>
            <p className="font-display text-4xl sm:text-5xl font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
              ${balance?.availableUsd ?? '0.00'}
            </p>
            <p className="font-mono text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('transfer.balanceSource')}
            </p>
          </div>

          {/* Send form */}
          <form
            onSubmit={handleSend}
            className="glass-panel border overflow-hidden"
            style={{ borderColor: 'var(--color-glass-border)' }}
          >
            <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-semibold">{t('transfer.newTransfer')}</h2>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {t('transfer.formHint')}
              </p>
            </div>

            <div className="p-6 space-y-8">
              {/* Step 1 */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <StepBadge n={1} active={!recipientOk} done={recipientOk} />
                  <div>
                    <p className="font-semibold">{t('transfer.step1Title')}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('transfer.step1Hint')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 ml-0 sm:ml-10">
                  <input
                    className="dev-input flex-1 font-mono min-w-0"
                    placeholder={t('transfer.usernamePlaceholder')}
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      setRecipientPreview(null);
                    }}
                    onBlur={() => {
                      if (recipient.trim() && !recipientPreview) handleLookup();
                    }}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant={recipientOk ? 'ghost' : 'primary'}
                    size="md"
                    loading={lookingUp}
                    disabled={!recipient.trim()}
                    onClick={handleLookup}
                  >
                    {recipientOk ? t('transfer.change') : t('transfer.findUser')}
                  </Button>
                </div>

                {recipientOk && (
                  <div
                    className="ml-0 sm:ml-10 flex items-center gap-3 p-4 rounded-xl border"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-success) 35%, transparent)',
                      background: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
                    }}
                  >
                    <span className="text-xl">✓</span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{recipientPreview.label}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {t('transfer.recipientConfirmed')}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Step 2 */}
              <section className={cn('space-y-3', !recipientOk && 'opacity-50 pointer-events-none')}>
                <div className="flex items-center gap-3">
                  <StepBadge n={2} active={recipientOk && !amountOk} done={amountOk} />
                  <div>
                    <p className="font-semibold">{t('transfer.step2Title')}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('transfer.step2Hint')}
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
                      min="0.01"
                      max={availableUsd || undefined}
                      className="dev-input w-full pl-10 py-4 font-mono text-2xl font-bold tabular-nums"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={!recipientOk}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {availableUsd > 0 && (
                      <button
                        type="button"
                        className="font-mono text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/[0.04]"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
                        onClick={() => setAmount(balance.availableUsd)}
                        disabled={!recipientOk}
                      >
                        {t('transfer.sendAll', { amount: balance.availableUsd })}
                      </button>
                    )}
                    {[10, 25, 50, 100].map((preset) =>
                      preset <= availableUsd ? (
                        <button
                          key={preset}
                          type="button"
                          className="font-mono text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/[0.04]"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                          onClick={() => setAmount(String(preset))}
                          disabled={!recipientOk}
                        >
                          ${preset}
                        </button>
                      ) : null
                    )}
                  </div>

                  {amountNum > availableUsd && (
                    <p className="font-mono text-xs" style={{ color: 'var(--color-danger)' }}>
                      {t('transfer.notEnoughBalance', { amount: balance?.availableUsd ?? '0.00' })}
                    </p>
                  )}
                </div>
              </section>

              {/* Step 3 */}
              <section className={cn('space-y-3', !recipientOk && 'opacity-50 pointer-events-none')}>
                <div className="flex items-center gap-3">
                  <StepBadge n={3} active={recipientOk && amountOk} done={false} />
                  <div>
                    <p className="font-semibold">{t('transfer.step3Title')}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('transfer.step3Hint')}
                    </p>
                  </div>
                </div>
                <div className="ml-0 sm:ml-10">
                  <input
                    className="dev-input w-full"
                    placeholder={t('transfer.notePlaceholder')}
                    maxLength={200}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={!recipientOk}
                  />
                </div>
              </section>

              {/* Review */}
              {recipientOk && amountOk && (
                <div
                  className="rounded-xl border p-5 space-y-3"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-surface-700)',
                  }}
                >
                  <p className="section-label">{t('transfer.review')}</p>
                  <div className="grid sm:grid-cols-2 gap-3 font-mono text-sm">
                    <div>
                      <p style={{ color: 'var(--color-text-muted)' }}>{t('transfer.to')}</p>
                      <p className="font-semibold truncate">{recipientPreview.label}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-muted)' }}>{t('transfer.amount')}</p>
                      <p className="font-semibold text-[var(--color-accent)]">${amountNum.toFixed(2)}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-muted)' }}>{t('transfer.balanceAfter')}</p>
                      <p className="font-semibold">${Math.max(0, balanceAfter).toFixed(2)}</p>
                    </div>
                    {note.trim() && (
                      <div className="sm:col-span-2">
                        <p style={{ color: 'var(--color-text-muted)' }}>{t('transfer.note')}</p>
                        <p className="truncate">{note.trim()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                size="md"
                loading={sending}
                disabled={!canSend}
                className="w-full py-3 text-base"
              >
                {canSend
                  ? t('transfer.sendButton', {
                      amount: amountNum.toFixed(2),
                      recipient: recipientPreview?.label || '',
                    })
                  : recipientOk
                    ? t('transfer.enterValidAmount')
                    : t('transfer.findRecipientFirst')}
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Receive card */}
          {user?.username && (
            <div
              className="glass-panel p-5 border"
              style={{ borderColor: 'var(--color-glass-border)' }}
            >
              <p className="section-label mb-3">{t('transfer.receiveMoney')}</p>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {t('transfer.shareUsername')}
              </p>
              <div
                className="flex items-center justify-between gap-3 p-4 rounded-xl border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                }}
              >
                <p className="font-mono text-xl font-bold truncate" style={{ color: 'var(--color-accent)' }}>
                  @{user.username}
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={copyUsername}>
                  {copied ? t('transfer.copied') : t('transfer.copy')}
                </Button>
              </div>
            </div>
          )}

          {/* How it works */}
          <div
            className="glass-panel p-5 border"
            style={{ borderColor: 'var(--color-glass-border)' }}
          >
            <p className="section-label mb-4">{t('transfer.howItWorks')}</p>
            <ol className="space-y-4">
              {howSteps.map((item, i) => (
                <li key={item.title} className="flex gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
                    style={{
                      background: 'var(--color-surface-700)',
                      color: 'var(--color-accent)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Balance breakdown */}
          <div
            className="glass-panel p-5 border space-y-3"
            style={{ borderColor: 'var(--color-glass-border)' }}
          >
            <p className="section-label">{t('transfer.balanceBreakdown')}</p>
            <div className="flex justify-between font-mono text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>{t('transfer.totalReceived')}</span>
              <span>${balance?.totalCreditedUsd ?? '0.00'}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>{t('transfer.totalSentSpent')}</span>
              <span>${balance?.totalDebitedUsd ?? '0.00'}</span>
            </div>
            <div
              className="flex justify-between font-mono text-sm pt-3 border-t font-semibold"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span>{t('transfer.availableNow')}</span>
              <span style={{ color: 'var(--color-accent)' }}>${balance?.availableUsd ?? '0.00'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="section-label">{t('transfer.transferHistory')}</p>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('transfer.historyHint')}
            </p>
          </div>
          <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {t('transfer.records', { count: transfers.length })}
          </span>
        </div>

        {transfers.length === 0 ? (
          <div className="glass-panel p-10 text-center border" style={{ borderColor: 'var(--color-glass-border)' }}>
            <p className="text-3xl mb-3 opacity-40">↔</p>
            <p className="font-semibold mb-1">{t('transfer.noTransfers')}</p>
            <p className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('transfer.noTransfersHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transfers.map((item) => (
              <div
                key={item.id}
                className="glass-panel p-4 flex items-center gap-4 border"
                style={{ borderColor: 'var(--color-glass-border)' }}
              >
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 font-mono text-xs font-bold border',
                    item.direction === 'sent'
                      ? 'text-[var(--color-danger)] border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)]'
                      : 'text-[var(--color-success)] border-[color-mix(in_srgb,var(--color-success)_30%,transparent)]'
                  )}
                  style={
                    item.direction === 'sent'
                      ? { background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' }
                      : { background: 'color-mix(in srgb, var(--color-success) 10%, transparent)' }
                  }
                >
                  <span className="text-base leading-none">{item.direction === 'sent' ? '↑' : '↓'}</span>
                  <span className="text-[9px] uppercase mt-0.5">
                    {item.direction === 'sent' ? t('transfer.directionSent') : t('transfer.directionReceived')}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {item.direction === 'sent' ? t('transfer.sentTo') : t('transfer.receivedFrom')}{' '}
                    <span style={{ color: 'var(--color-accent)' }}>{item.counterparty.label}</span>
                  </p>
                  {item.note && (
                    <p className="font-mono text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                      “{item.note}”
                    </p>
                  )}
                  <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {formatTime(item.createdAt)}
                  </p>
                </div>

                <p
                  className={cn(
                    'font-mono text-lg font-bold shrink-0 tabular-nums',
                    item.direction === 'sent' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
                  )}
                >
                  {item.direction === 'sent' ? '−' : '+'}${item.amountUsd}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
