import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export default function IconSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  className,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (next) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'input-field w-full flex items-center gap-3 text-left pr-10',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {selected ? (
          <>
            {selected.icon}
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                {selected.label}
              </span>
              {selected.sublabel && (
                <span className="block font-mono text-[11px] truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {selected.sublabel}
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {placeholder}
          </span>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border py-1 shadow-lg"
          style={{
            background: 'var(--color-surface-800)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={String(opt.value)} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    active && 'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
                  )}
                >
                  {opt.icon}
                  <span className="min-w-0 flex-1">
                    <span
                      className="block font-mono text-sm truncate"
                      style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                    >
                      {opt.label}
                    </span>
                    {opt.sublabel && (
                      <span className="block font-mono text-[11px] truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {opt.sublabel}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Chevron({ open }) {
  return (
    <svg
      className={cn('absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-transform pointer-events-none', open && 'rotate-180')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      style={{ color: 'var(--color-text-muted)' }}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
