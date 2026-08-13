import { cn } from '../../lib/cn';

export function Input({ className, ...props }) {
  return <input className={cn('input-field', className)} {...props} />;
}

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        'block font-mono text-xs uppercase tracking-wider mb-2',
        className
      )}
      style={{ color: 'var(--color-text-secondary)' }}
      {...props}
    >
      {children}
    </label>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn('input-field appearance-none cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

export function Hint({ className, children }) {
  return (
    <p className={cn('font-mono text-[11px] mt-1.5', className)} style={{ color: 'var(--color-text-muted)' }}>
      {children}
    </p>
  );
}
