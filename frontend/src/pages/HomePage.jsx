import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPayment, getNetworks, getLiveQuotes } from '../api';
import { userDisplayId } from '../auth';
import { useAuth } from '../AuthContext';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Label } from '../components/ui/Input';
import IconSelect from '../components/ui/IconSelect';
import AmountInput from '../components/ui/AmountInput';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { NetworkIcon, TokenIcon } from '../components/CryptoIcon';

function formatTokenAmount(value, symbol) {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (symbol === 'USDC' || symbol === 'USDT') return n.toFixed(2);
  if (n >= 1) return n.toFixed(6);
  return n.toFixed(8);
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [networks, setNetworks] = useState([]);
  const [rates, setRates] = useState({});
  const [chainId, setChainId] = useState(11155111);
  const [tokenSymbol, setTokenSymbol] = useState('ETH');
  const [amountUsd, setAmountUsd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getNetworks()
      .then((data) => {
        setNetworks(data);
        if (data.length > 0) {
          setChainId(data[0].chainId);
          setTokenSymbol(data[0].nativeSymbol);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadQuotes = () => {
      getLiveQuotes()
        .then((data) => {
          if (cancelled) return;
          const next = {};
          for (const q of data.quotes || []) {
            if (q.symbol && q.priceUsd != null) next[q.symbol] = Number(q.priceUsd);
          }
          setRates(next);
        })
        .catch(() => {});
    };
    loadQuotes();
    const interval = setInterval(loadQuotes, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const selectedNetwork = networks.find((n) => n.chainId === chainId);
  const availableTokens = selectedNetwork?.tokens || [];
  const selectedToken = availableTokens.find((tok) => tok.symbol === tokenSymbol);
  const usdRate = rates[tokenSymbol] ?? (tokenSymbol === 'USDC' || tokenSymbol === 'USDT' ? 1 : null);
  const usdNum = parseFloat(amountUsd) || 0;
  const tokenAmount =
    usdRate > 0 && usdNum > 0 ? formatTokenAmount(usdNum / usdRate, tokenSymbol) : '';

  const networkOptions = useMemo(
    () =>
      networks.map((n) => ({
        value: n.chainId,
        label: n.name,
        sublabel: t('home.chainSublabel', { chainId: n.chainId }),
        icon: <NetworkIcon chainId={n.chainId} name={n.name} size={28} />,
      })),
    [networks, t]
  );

  const tokenOptions = useMemo(
    () =>
      availableTokens.map((tok) => ({
        value: tok.symbol,
        label: tok.symbol,
        sublabel: tok.name !== tok.symbol ? tok.name : undefined,
        icon: <TokenIcon symbol={tok.symbol} size={28} />,
      })),
    [availableTokens]
  );

  const howSteps = useMemo(() => t('home.steps', { returnObjects: true }), [t]);

  const handleNetworkChange = (newChainId) => {
    const id = Number(newChainId);
    setChainId(id);
    const network = networks.find((n) => n.chainId === id);
    if (network) setTokenSymbol(network.nativeSymbol);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!(usdNum > 0)) {
      setError(t('home.invalidUsd'));
      return;
    }
    if (!(usdRate > 0)) {
      setError(t('home.rateUnavailable', { token: tokenSymbol }));
      return;
    }
    setLoading(true);
    try {
      const payment = await createPayment({
        amountUsd: usdNum.toFixed(2),
        email: user?.email,
        name: user?.name,
        chainId,
        tokenSymbol,
      });
      navigate(`/pay/${payment.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col">
      <PageHeader
        title={t('home.title')}
        label={t('home.label')}
        description={t('home.description', { userId: userDisplayId(user) })}
        className="text-center sm:text-left [&_.eyebrow]:mx-auto sm:[&_.eyebrow]:mx-0 [&_p]:mx-auto sm:[&_p]:mx-0"
      />

      <div className="flex w-full min-w-0 flex-1 flex-col justify-center gap-6 min-h-[calc(100dvh-16rem)] sm:min-h-[calc(100dvh-14rem)] lg:min-h-0 lg:block lg:flex-none">
        <div className="grid w-full min-w-0 gap-6 lg:grid-cols-5">
          <Card className="w-full min-w-0 max-w-full justify-self-center lg:col-span-3 lg:justify-self-stretch">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="min-w-0">
                  <Label>{t('home.network')}</Label>
                  <IconSelect
                    value={chainId}
                    onChange={handleNetworkChange}
                    options={networkOptions}
                    placeholder={t('home.selectNetwork')}
                    aria-label={t('home.network')}
                    disabled={networks.length === 0}
                    className="w-full min-w-0"
                  />
                </div>

                <div className="min-w-0">
                  <Label>{t('home.token')}</Label>
                  <IconSelect
                    value={tokenSymbol}
                    onChange={setTokenSymbol}
                    options={tokenOptions}
                    placeholder={t('home.selectToken')}
                    aria-label={t('home.token')}
                    disabled={!selectedNetwork}
                    className="w-full min-w-0"
                  />
                </div>

                <div className="min-w-0 space-y-2">
                  <Label>{t('home.amountUsd')}</Label>
                  <AmountInput
                    required
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    unit="USD"
                    leading={
                      <span className="font-mono text-lg font-bold" style={{ color: 'var(--color-accent)' }}>
                        $
                      </span>
                    }
                    placeholder="10.00"
                    min="0.01"
                    step="0.01"
                    className="w-full min-w-0"
                  />
                  <div
                    className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-700)' }}
                  >
                    <div className="min-w-0">
                      <p className="section-label text-[10px] mb-1">{t('home.youPayInToken')}</p>
                      <p className="font-mono text-sm font-semibold truncate">
                        {tokenAmount
                          ? t('home.tokenPreview', { amount: tokenAmount, token: tokenSymbol })
                          : t('home.tokenPreviewEmpty', { token: tokenSymbol })}
                      </p>
                    </div>
                    <TokenIcon symbol={tokenSymbol} size={28} />
                  </div>
                  {usdRate > 0 && (
                    <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {t('home.rateLine', {
                        token: tokenSymbol,
                        rate:
                          usdRate >= 1
                            ? usdRate.toLocaleString(undefined, { maximumFractionDigits: 4 })
                            : usdRate.toFixed(6),
                      })}
                    </p>
                  )}
                </div>

                {error && <Alert>{error}</Alert>}

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={networks.length === 0 || !(usdNum > 0) || !(usdRate > 0)}
                >
                  {t('home.continueToPayment')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="w-full min-w-0 space-y-4 justify-self-center lg:col-span-2 lg:justify-self-stretch">
            <Card className="w-full min-w-0">
              <CardContent className="pt-6 space-y-3">
                <h3 className="section-label text-[10px]">{t('home.howItWorks')}</h3>
                <ol className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {howSteps.map((step, i) => (
                    <li key={step} className="flex gap-3 min-w-0">
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold font-mono flex items-center justify-center"
                        style={{
                          background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {selectedNetwork && (
              <Card className="w-full min-w-0">
                <CardContent className="pt-6">
                  <p className="section-label text-[10px] mb-3">{t('home.selected')}</p>
                  <div className="flex items-center gap-3 min-w-0">
                    <NetworkIcon chainId={selectedNetwork.chainId} name={selectedNetwork.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{selectedNetwork.name}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 min-w-0 flex-wrap">
                        <TokenIcon symbol={tokenSymbol} size={20} />
                        <span className="font-mono text-xs font-semibold">{tokenSymbol}</span>
                        {usdNum > 0 && (
                          <span className="font-mono text-xs truncate" style={{ color: 'var(--color-accent)' }}>
                            · ${usdNum.toFixed(2)}
                            {tokenAmount ? ` ≈ ${tokenAmount}` : ''}
                          </span>
                        )}
                      </div>
                      {selectedToken?.name && selectedToken.name !== tokenSymbol && (
                        <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {selectedToken.name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
