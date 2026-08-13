import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getNetworks } from '../api';
import { useAuth } from '../AuthContext';
import PageHeader from '../components/ui/PageHeader';
import { NetworkIcon, TokenIcon } from '../components/CryptoIcon';
import { PageLoader } from '../components/ui/Spinner';

export default function NetworksPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNetworks()
      .then(setNetworks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader message={t('pageCommon.loading.networks')} />;

  const totalTokens = networks.reduce((sum, n) => sum + n.tokens.length, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('networks.title')}
        label={isAdmin ? t('networks.labelPlatform') : t('networks.labelSupported')}
        description={
          isAdmin
            ? t('networks.descriptionAdmin', { networks: networks.length, tokens: totalTokens })
            : t('networks.descriptionUser', { networks: networks.length, tokens: totalTokens })
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {networks.map((network) => (
          <NetworkCard key={network.chainId} network={network} isAdmin={isAdmin} t={t} />
        ))}
      </div>
    </div>
  );
}

function NetworkCard({ network, isAdmin, t }) {
  return (
    <article
      className="glass-panel p-5 flex flex-col gap-4 transition-all duration-200 hover:border-[color-mix(in_srgb,var(--color-accent)_35%,transparent)] hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-3.5">
        <NetworkIcon chainId={network.chainId} name={network.name} size={48} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base leading-snug truncate" style={{ color: 'var(--color-text-primary)' }}>
            {network.name}
          </h3>
          {isAdmin && (
            <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('networks.chainInfo', { chainId: network.chainId, nativeSymbol: network.nativeSymbol })}
            </p>
          )}
        </div>
      </div>

      <div
        className="h-px w-full"
        style={{ background: 'color-mix(in srgb, var(--color-border) 80%, transparent)' }}
      />

      <div>
        <p className="section-label text-[10px] mb-3">{t('networks.tokens')}</p>
        <ul className="space-y-2">
          {network.tokens.map((token) => (
            <li key={token.symbol}>
              <TokenRow symbol={token.symbol} name={token.name} />
            </li>
          ))}
        </ul>
      </div>

      {isAdmin && network.explorer && (
        <a
          href={network.explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs mt-auto pt-1 hover:underline w-fit"
          style={{ color: 'var(--color-accent)' }}
        >
          {t('networks.blockExplorer')}
        </a>
      )}
    </article>
  );
}

function TokenRow({ symbol, name }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'color-mix(in srgb, var(--color-surface-700) 65%, transparent)' }}
    >
      <TokenIcon symbol={symbol} size={32} />
      <div className="min-w-0">
        <p className="font-mono text-sm font-semibold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          {symbol}
        </p>
        {name && name !== symbol && (
          <p className="font-mono text-[11px] mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
            {name}
          </p>
        )}
      </div>
    </div>
  );
}
