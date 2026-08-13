import { cn } from '../../lib/cn';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('glass-panel', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn('px-4 sm:px-6 pt-4 sm:pt-6 pb-2', className)}>{children}</div>;
}

export function CardTitle({ className, children }) {
  return (
    <h2 className={cn('text-lg font-semibold text-[var(--color-text-primary)]', className)}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, children }) {
  return (
    <p className={cn('text-sm text-[var(--color-text-secondary)] mt-1', className)}>{children}</p>
  );
}

export function CardContent({ className, children }) {
  return <div className={cn('px-4 sm:px-6 pb-4 sm:pb-6', className)}>{children}</div>;
}
