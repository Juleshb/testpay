import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { BrandWordmark } from '../BrandLogo';

function ConsoleDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="console-dot" style={{ color: 'var(--color-accent)' }}>
          .
        </span>
      ))}
    </span>
  );
}

export function ConsoleLoader({
  message = 'loading',
  lines = [],
  className,
  compact = false,
  showHeader = true,
}) {
  return (
    <div
      className={cn('glass-panel font-mono', compact ? 'p-3 text-xs' : 'p-5 text-sm', className)}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {showHeader && (
        <div className="flex items-center mb-3 pb-3 border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
          <BrandWordmark size="xs" />
        </div>
      )}

      {lines.map((line, i) => (
        <div
          key={`${line}-${i}`}
          className={cn(compact ? 'mt-1' : 'mt-1.5')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span style={{ color: 'var(--color-accent)' }}>{'>'}</span> {line}
        </div>
      ))}

      <div className={cn('flex items-center', lines.length ? (compact ? 'mt-2' : 'mt-3') : '')}>
        <span style={{ color: 'var(--color-accent)' }}>$</span>
        <span className="ml-2" style={{ color: 'var(--color-text-primary)' }}>
          {message}
        </span>
        <ConsoleDots />
        <span className="console-cursor" />
      </div>
    </div>
  );
}

export default function Spinner({ className, message = 'wait' }) {
  return (
    <ConsoleLoader message={message} compact showHeader={false} className={cn('inline-block', className)} />
  );
}

export function PageLoader({ message = 'loading' }) {
  const bootSequence = ['connecting to api', 'fetching resources', 'preparing dashboard'];
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= bootSequence.length) return undefined;
    const timer = setTimeout(() => setVisibleLines((n) => n + 1), 450);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[40vh] gap-6">
      <BrandWordmark size="xl" className="boot-mark" />
      <div className="boot-bar">
        <i />
      </div>
      <ConsoleLoader
        message={message}
        lines={bootSequence.slice(0, visibleLines)}
        className="w-full max-w-lg"
        showHeader={false}
      />
    </div>
  );
}

export function InlineConsoleLoader({ message = 'processing' }) {
  return (
    <span className="inline-flex items-center font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>
      <span style={{ color: 'var(--color-accent)' }}>$</span>
      <span className="ml-1">{message}</span>
      <ConsoleDots />
    </span>
  );
}
