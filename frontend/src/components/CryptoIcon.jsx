import { useState, useEffect } from 'react';
import { cn } from '../lib/cn';
import { getIconFallback, getNetworkIconUrl, getTokenIconUrl } from '../data/cryptoIcons';

export function CryptoIcon({ src, label, size = 40, className, ring = false }) {
  const [failed, setFailed] = useState(!src);
  const px = `${size}px`;

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl',
        ring && 'ring-2 ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]',
        className
      )}
      style={{
        width: px,
        height: px,
        background: failed
          ? 'color-mix(in srgb, var(--color-accent) 14%, var(--color-surface-700))'
          : 'var(--color-surface-700)',
      }}
    >
      {!failed && src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-mono font-semibold uppercase"
          style={{
            fontSize: size <= 28 ? '0.55rem' : '0.65rem',
            color: 'var(--color-accent)',
          }}
        >
          {getIconFallback(label)}
        </span>
      )}
    </span>
  );
}

export function NetworkIcon({ chainId, name, size = 44, className }) {
  return (
    <CryptoIcon
      src={getNetworkIconUrl(chainId)}
      label={name}
      size={size}
      ring
      className={className}
    />
  );
}

export function TokenIcon({ symbol, size = 28, className }) {
  return (
    <CryptoIcon src={getTokenIconUrl(symbol)} label={symbol} size={size} className={className} />
  );
}
