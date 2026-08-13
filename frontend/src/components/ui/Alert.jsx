import { cn } from '../../lib/cn';

const variants = {
  error:
    'bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] text-[var(--color-danger)]',
  success:
    'bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] text-[var(--color-success)]',
  warning:
    'bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)] text-[var(--color-warning)]',
  info:
    'bg-[color-mix(in_srgb,var(--color-info)_10%,transparent)] border-[color-mix(in_srgb,var(--color-info)_30%,transparent)] text-[var(--color-info)]',
};

export default function Alert({ variant = 'error', children, className }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm font-mono', variants[variant], className)} role="alert">
      {children}
    </div>
  );
}
