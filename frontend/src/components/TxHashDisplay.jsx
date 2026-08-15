import { useTranslation } from 'react-i18next';
import { explorerTxUrl } from '../withdrawalsApi';
import CopyButton from './ui/CopyButton';
import { cn } from '../lib/cn';

export default function TxHashDisplay({
  txHash,
  explorer,
  className,
  compact = false,
  showExplorerLink = true,
}) {
  const { t } = useTranslation();
  if (!txHash) return null;

  const txUrl = showExplorerLink ? explorerTxUrl(explorer, txHash) : null;
  const short = `${txHash.slice(0, 10)}…${txHash.slice(-8)}`;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 min-w-0', className)}>
      <p
        className={cn(
          'font-mono break-all min-w-0',
          compact ? 'text-[10px]' : 'text-[11px]'
        )}
        style={{ color: 'var(--color-text-muted)' }}
        title={txHash}
      >
        <span className="uppercase tracking-wider mr-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {t('withdraw.txHashLabel')}
        </span>
        {compact ? short : txHash}
      </p>
      <CopyButton text={txHash} label={t('withdraw.copyTx')} className="text-[10px]" />
      {txUrl && (
        <a
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] hover:underline shrink-0"
          style={{ color: 'var(--color-accent)' }}
        >
          {t('withdraw.viewTx')}
        </a>
      )}
    </div>
  );
}
