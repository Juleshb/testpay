import { cn } from '../../lib/cn';

export default function StatCard({ label, value, hint, color, className }) {
  return (
    <div className={cn('glass-panel p-3 sm:p-4 lg:p-5 min-w-0', className)}>
      <div className="section-label mb-1.5 sm:mb-2 truncate">{label}</div>
      <div
        className={cn('text-lg sm:text-2xl lg:text-3xl font-bold tabular-nums font-mono break-all sm:break-normal', color)}
        style={!color ? { color: 'var(--color-text-primary)' } : undefined}
      >
        {value}
      </div>
      {hint && (
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}
