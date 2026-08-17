import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPayment, getPaymentBalance, registerPaymentTx } from '../api';
import {
  connectWallet,
  sendPayment,
  waitForTransaction,
  shortenAddress,
  getExplorerUrl,
  getAddressExplorerUrl,
  getChainName,
  switchToChain,
  loadNetworks,
  getTokenFromNetwork,
  getWalletTokenBalance,
  formatPaymentError,
} from '../wallet';
import { useAuth } from '../AuthContext';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import CopyButton from '../components/ui/CopyButton';
import { NetworkIcon, TokenIcon } from '../components/CryptoIcon';
import { PageLoader } from '../components/ui/Spinner';

export default function PaymentPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [networks, setNetworks] = useState([]);
  const [payment, setPayment] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState('');
  const [balanceError, setBalanceError] = useState('');

  useEffect(() => {
    loadNetworks().then(setNetworks).catch(console.error);
  }, []);

  const fetchData = useCallback(async () => {
    let currentPayment;
    try {
      currentPayment = await getPayment(id);
      setPayment(currentPayment);
      setError('');
    } catch (err) {
      setError(err.message);
      return;
    } finally {
      setLoading(false);
    }

    try {
      const balanceData = await getPaymentBalance(id);
      setBalance(balanceData);
      setBalanceError('');
    } catch {
      setBalanceError(t('payment.balanceError'));
      setBalance({
        receivedAmount: '0',
        requiredAmount: currentPayment.amount,
        isSufficient: false,
      });
    }
  }, [id, t]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const network = networks.find((n) => n.chainId === payment?.chainId);
  const token = network ? getTokenFromNetwork(network, payment?.tokenSymbol) : null;

  const refreshWalletBalance = useCallback(async (signer, tokenMeta) => {
    if (!signer || !tokenMeta) return;
    try {
      const bal = await getWalletTokenBalance(signer, tokenMeta);
      setWalletBalance(bal);
    } catch {
      setWalletBalance(null);
    }
  }, []);

  useEffect(() => {
    if (wallet?.signer && token) {
      refreshWalletBalance(wallet.signer, token);
    }
  }, [wallet, token, refreshWalletBalance]);

  const handleConnect = async () => {
    setError('');
    try {
      const connected = await connectWallet(payment?.chainId, networks);
      setWallet(connected);
      if (token) await refreshWalletBalance(connected.signer, token);
    } catch (err) {
      setError(formatPaymentError(err));
    }
  };

  const handlePay = async () => {
    if (!wallet || !payment || !token) return;
    setError('');
    setPaying(true);

    try {
      await switchToChain(payment.chainId, networks);
      const fresh = await connectWallet(payment.chainId, networks);
      setWallet(fresh);

      const tx = await sendPayment(
        fresh.signer,
        payment.depositAddress,
        payment.amount,
        token
      );
      setTxHash(tx.hash);
      await registerPaymentTx(id, tx.hash);
      await waitForTransaction(fresh.provider, tx.hash);
      await fetchData();
    } catch (err) {
      setError(formatPaymentError(err));
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <PageLoader message={t('pageCommon.loading.payment')} />;

  if (error && !payment) {
    return (
      <div className="max-w-lg w-full mx-auto text-center py-12 sm:py-20 px-3">
        <Alert className="mb-4 text-left">{error}</Alert>
        <Link to="/payments/new" className="text-primary hover:underline text-sm font-medium">
          {t('payment.backToPayments')}
        </Link>
      </div>
    );
  }

  const isPaid = payment.status === 'CONFIRMED' || payment.status === 'SWEPT';
  const symbol = payment.tokenSymbol;
  const networkName = payment.networkName || getChainName(payment.chainId, networks);
  const requiredNum = parseFloat(balance?.requiredAmount || payment.amount);
  const receivedNum = parseFloat(payment.paidAmount || balance?.receivedAmount || '0');
  const isSufficient = balance?.isSufficient ?? (isPaid || receivedNum >= requiredNum);
  const progress = requiredNum > 0 ? Math.min(100, (receivedNum / requiredNum) * 100) : 0;
  const wrongNetwork = wallet && wallet.chainId !== payment.chainId;

  return (
    <div className="max-w-xl w-full mx-auto min-w-0">
      <PageHeader
        className="mb-4 sm:mb-6"
        title={t('payment.title')}
        description={t('payment.description', { network: networkName, symbol })}
        actions={
          <div className="w-fit shrink-0">
            <Badge status={payment.status} />
          </div>
        }
      />

      <StepsBar isPaid={isPaid} hasWallet={!!wallet} />

      <Card className="mb-3 sm:mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div
            className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <NetworkIcon chainId={payment.chainId} name={networkName} size={36} className="sm:hidden shrink-0" />
            <NetworkIcon chainId={payment.chainId} name={networkName} size={40} className="hidden sm:block shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{networkName}</p>
              <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                <TokenIcon symbol={symbol} size={16} className="sm:hidden" />
                <TokenIcon symbol={symbol} size={18} className="hidden sm:block" />
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {symbol}
                </span>
              </div>
            </div>
            {wrongNetwork && (
              <span
                className="font-mono text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shrink-0 max-w-[40%] text-center leading-tight"
                style={{ color: 'var(--color-danger)', background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)' }}
              >
                {t('payment.wrongNetwork')}
              </span>
            )}
          </div>

          <div className="px-3 sm:px-5 py-4 sm:py-6 text-center border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="section-label text-[10px] mb-1.5 sm:mb-2">{t('payment.requested')}</p>
            <p
              className="font-mono text-2xl sm:text-3xl font-bold tabular-nums break-all"
              style={{ color: 'var(--color-accent)' }}
            >
              {payment.amount} {symbol}
            </p>
            <p
              className="font-mono text-xs sm:text-sm tabular-nums mt-2 sm:mt-3 break-all"
              style={{ color: isPaid || receivedNum > 0 ? 'var(--color-success)' : 'var(--color-text-secondary)' }}
            >
              {t('payment.received', { amount: receivedNum.toFixed(6), symbol })}
            </p>
            {isPaid && (
              <p className="font-mono text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                {receivedNum + 1e-12 < requiredNum
                  ? t('payment.underpaidNote')
                  : receivedNum > requiredNum + 1e-12
                    ? t('payment.overpaidNote')
                    : t('payment.creditedNote')}
              </p>
            )}
            {!isPaid && (
              <div className="mt-3 sm:mt-4 max-w-xs mx-auto px-1">
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'var(--color-surface-700)' }}
                >
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{ width: `${progress}%`, background: 'var(--color-accent)' }}
                  />
                </div>
                {balanceError && (
                  <p className="text-xs mt-2 text-left sm:text-center" style={{ color: 'var(--color-warning)' }}>
                    {balanceError}
                  </p>
                )}
              </div>
            )}
          </div>

          {(payment.name || payment.email) && (
            <div
              className="px-3 sm:px-5 py-3 sm:py-4 space-y-2 border-b text-sm"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {payment.name && <DetailRow label={t('payment.name')} value={payment.name} />}
              {payment.email && <DetailRow label={t('payment.email')} value={payment.email} />}
            </div>
          )}

          <div className="px-3 sm:px-5 py-3 sm:py-4">
            <div className="flex items-start sm:items-center justify-between gap-2 mb-2">
              <p className="section-label text-[10px] pt-0.5">{t('payment.depositAddress')}</p>
              <CopyButton text={payment.depositAddress} />
            </div>
            <code
              className="block font-mono text-[11px] sm:text-xs break-all leading-relaxed select-all"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {payment.depositAddress}
            </code>
            {isAdmin && (
              <a
                href={getAddressExplorerUrl(payment.chainId, payment.depositAddress, networks)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs hover:underline mt-2 inline-block"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('payment.viewOnExplorer')}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {isPaid ? (
        <div className="glass-panel px-3 sm:px-5 py-5 sm:py-6 text-center mb-3 sm:mb-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3 text-lg"
            style={{ background: 'color-mix(in srgb, var(--color-success) 18%, transparent)', color: 'var(--color-success)' }}
          >
            ✓
          </div>
          <p className="font-semibold" style={{ color: 'var(--color-success)' }}>
            {t('payment.paymentReceived')}
          </p>
          {payment.txHash && isAdmin && (
            <a
              href={getExplorerUrl(payment.chainId, payment.txHash, networks)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs hover:underline mt-3 inline-block"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('payment.viewTransaction')}
            </a>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
            {wrongNetwork && (
              <Alert variant="warning">
                {t('payment.switchNetwork', { network: networkName })}
              </Alert>
            )}
            {!wallet ? (
              <Button variant="wallet" className="w-full" onClick={handleConnect}>
                <WalletIcon />
                {t('payment.connectWallet')}
              </Button>
            ) : (
              <>
                <div
                  className="text-center text-xs sm:text-sm space-y-1.5 py-1 sm:py-2 px-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <p className="break-all">
                    {t('payment.connected')}{' '}
                    <span className="font-mono text-[11px] sm:text-xs" style={{ color: 'var(--color-text-primary)' }}>
                      {shortenAddress(wallet.address)}
                    </span>
                  </p>
                  {walletBalance !== null && (
                    <p className="break-all">
                      {t('payment.balance')}{' '}
                      <span
                        className={
                          parseFloat(walletBalance) >= parseFloat(payment.amount)
                            ? 'text-success font-medium'
                            : 'text-danger font-medium'
                        }
                      >
                        {parseFloat(walletBalance).toFixed(6)} {symbol}
                      </span>
                    </p>
                  )}
                  {walletBalance !== null && parseFloat(walletBalance) < parseFloat(payment.amount) && (
                    <p className="text-danger text-xs leading-relaxed">
                      {t('payment.needAtLeast', { amount: payment.amount, symbol, network: networkName })}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={handlePay}
                  loading={paying}
                  disabled={walletBalance !== null && parseFloat(walletBalance) < parseFloat(payment.amount)}
                >
                  {t('payment.pay', { amount: payment.amount, symbol })}
                </Button>
              </>
            )}

            {txHash && (
              <p className="text-center text-xs sm:text-sm text-muted break-all px-1">
                {t('payment.tx')}{' '}
                {isAdmin ? (
                  <a
                    href={getExplorerUrl(wallet?.chainId || payment.chainId, txHash, networks)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono text-[11px] sm:text-xs"
                  >
                    {shortenAddress(txHash)}
                  </a>
                ) : (
                  <span className="font-mono text-[11px] sm:text-xs">{shortenAddress(txHash)}</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {error && <Alert className="mt-3 sm:mt-4">{error}</Alert>}
    </div>
  );
}

function StepsBar({ isPaid, hasWallet }) {
  const { t } = useTranslation();
  const steps = [
    { key: 'create', label: t('payment.steps.create'), done: true, active: false },
    { key: 'send', label: t('payment.steps.send'), done: hasWallet || isPaid, active: !isPaid },
    { key: 'confirm', label: t('payment.steps.confirm'), done: isPaid, active: isPaid },
  ];

  return (
    <div className="mb-4 sm:mb-6">
      <div className="grid grid-cols-3 gap-1 sm:hidden">
        {steps.map((step, i) => (
          <div key={step.key} className="flex flex-col items-center gap-1 min-w-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={
                step.done
                  ? { background: 'color-mix(in srgb, var(--color-success) 18%, transparent)', color: 'var(--color-success)' }
                  : step.active
                    ? { background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)', color: 'var(--color-accent)' }
                    : { background: 'var(--color-surface-700)', color: 'var(--color-text-muted)' }
              }
            >
              {step.done ? '✓' : i + 1}
            </div>
            <span
              className="font-mono text-[9px] uppercase tracking-wide truncate w-full text-center"
              style={{ color: step.active || step.done ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={
                step.done
                  ? { background: 'color-mix(in srgb, var(--color-success) 18%, transparent)', color: 'var(--color-success)' }
                  : step.active
                    ? { background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)', color: 'var(--color-accent)' }
                    : { background: 'var(--color-surface-700)', color: 'var(--color-text-muted)' }
              }
            >
              {step.done ? '✓' : i + 1}
            </div>
            <span
              className="font-mono truncate"
              style={{ color: step.active || step.done ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-1 min-w-[0.5rem]" style={{ background: 'var(--color-border)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-4 min-w-0">
      <span className="text-xs sm:text-sm shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="text-sm sm:text-base truncate sm:text-right break-all sm:break-normal">{value}</span>
    </div>
  );
}

function WalletIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}
