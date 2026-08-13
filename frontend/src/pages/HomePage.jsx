import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPayment, getNetworks } from '../api';
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

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [networks, setNetworks] = useState([]);
  const [chainId, setChainId] = useState(11155111);
  const [tokenSymbol, setTokenSymbol] = useState('ETH');
  const [amount, setAmount] = useState('');
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

  const selectedNetwork = networks.find((n) => n.chainId === chainId);
  const availableTokens = selectedNetwork?.tokens || [];

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
    setLoading(true);
    try {
      const payment = await createPayment({
        amount,
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
    <div className="max-w-2xl w-full">
      <PageHeader
        title={t('home.title')}
        label={t('home.label')}
        description={t('home.description', { userId: userDisplayId(user) })}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>{t('home.network')}</Label>
                <IconSelect
                  value={chainId}
                  onChange={handleNetworkChange}
                  options={networkOptions}
                  placeholder={t('home.selectNetwork')}
                  aria-label={t('home.network')}
                  disabled={networks.length === 0}
                />
              </div>

              <div>
                <Label>{t('home.token')}</Label>
                <IconSelect
                  value={tokenSymbol}
                  onChange={setTokenSymbol}
                  options={tokenOptions}
                  placeholder={t('home.selectToken')}
                  aria-label={t('home.token')}
                  disabled={!selectedNetwork}
                />
              </div>

              <div>
                <Label>{t('home.amount')}</Label>
                <AmountInput
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  tokenSymbol={tokenSymbol}
                  placeholder="0.01"
                />
              </div>

              {error && <Alert>{error}</Alert>}

              <Button type="submit" className="w-full" loading={loading} disabled={networks.length === 0}>
                {t('home.continueToPayment')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="section-label text-[10px]">{t('home.howItWorks')}</h3>
              <ol className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {howSteps.map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold font-mono flex items-center justify-center"
                      style={{
                        background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {selectedNetwork && (
            <Card>
              <CardContent className="pt-6">
                <p className="section-label text-[10px] mb-3">{t('home.selected')}</p>
                <div className="flex items-center gap-3">
                  <NetworkIcon chainId={selectedNetwork.chainId} name={selectedNetwork.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{selectedNetwork.name}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <TokenIcon symbol={tokenSymbol} size={20} />
                      <span className="font-mono text-xs font-semibold">{tokenSymbol}</span>
                      {amount && (
                        <span className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                          · {amount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
