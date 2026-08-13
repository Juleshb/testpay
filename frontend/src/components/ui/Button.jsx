import { cn } from '../../lib/cn';
import { InlineConsoleLoader } from './Spinner';

const variants = {
  primary: 'btn-six-primary',
  secondary:
    'bg-[var(--color-surface-700)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)]',
  ghost: 'btn-six-ghost',
  danger:
    'bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] text-[var(--color-danger)]',
  wallet:
    'bg-[var(--color-surface-700)] border border-[color-mix(in_srgb,var(--color-accent)_35%,transparent)] text-[var(--color-text-primary)] hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-full font-mono',
  md: 'px-4 py-2 text-sm rounded-full',
  lg: 'px-5 py-2.5 text-sm rounded-full',
};

export default function Button({
  variant = 'primary',
  size = 'lg',
  className,
  children,
  loading,
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-h-[2.75rem] sm:min-h-0',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <InlineConsoleLoader message="processing" /> : children}
    </button>
  );
}
