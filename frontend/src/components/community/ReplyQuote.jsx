import { cn } from '../../lib/cn';

export function parseQuoteText(text) {
  if (!text) return { author: null, body: '' };
  const match = text.match(/^([^:\n]{1,80}):\s*"([\s\S]*)"$/);
  if (match) return { author: match[1].replace(/^@/, ''), body: match[2] };
  const simple = text.match(/^([^:\n]{1,80}):\s*(.+)$/);
  if (simple) return { author: simple[1].replace(/^@/, ''), body: simple[2] };
  return { author: null, body: text };
}

export function formatQuoteText(author, excerpt) {
  return `${author}: "${excerpt}"`;
}

export default function ReplyQuote({
  text,
  author,
  excerpt,
  isOwn = false,
  variant = 'bubble',
  onDismiss,
  className,
}) {
  const parsed = author || excerpt
    ? { author: author?.replace(/^@/, ''), body: excerpt || '' }
    : parseQuoteText(text);

  const label = variant === 'composer' ? 'Replying to channel' : 'Replied to channel';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border transition-colors',
        variant === 'composer' && 'mb-2',
        className
      )}
      style={{
        background: isOwn
          ? 'rgba(255,255,255,0.12)'
          : 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface-800))',
        borderColor: isOwn
          ? 'rgba(255,255,255,0.2)'
          : 'color-mix(in srgb, var(--color-accent) 25%, var(--color-border))',
      }}
    >
      <div className="flex gap-0">
        <div
          className="w-1 shrink-0"
          style={{
            background: isOwn ? 'rgba(255,255,255,0.65)' : 'var(--color-accent)',
          }}
        />
        <div className="min-w-0 flex-1 px-2 py-1.5 sm:px-3 sm:py-2.5 pr-7 sm:pr-8">
          <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
            <svg
              className="w-3 h-3 shrink-0 opacity-70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            <span
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{
                color: isOwn ? 'inherit' : 'var(--color-accent)',
                opacity: 0.85,
              }}
            >
              {label}
            </span>
          </div>
          {parsed.author && (
            <p
              className="text-[11px] sm:text-xs font-semibold truncate mb-0.5"
              style={{ color: isOwn ? 'inherit' : 'var(--color-text)' }}
            >
              {parsed.author}
            </p>
          )}
          <p
            className={cn(
              'text-[11px] sm:text-xs leading-snug',
              variant === 'bubble' ? 'line-clamp-3' : 'line-clamp-2'
            )}
            style={{
              color: isOwn ? 'inherit' : 'var(--color-text-muted)',
              opacity: isOwn ? 0.9 : 1,
            }}
          >
            {parsed.body}
          </p>
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Remove reply quote"
        >
          <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
