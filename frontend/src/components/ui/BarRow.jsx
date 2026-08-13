export default function BarRow({ label, count, max, valueLabel }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1 font-mono">
        <span className="truncate pr-2" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
        <span style={{ color: 'var(--color-text-primary)' }}>{valueLabel ?? count}</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--color-surface-700)' }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'var(--color-accent)' }}
        />
      </div>
    </div>
  );
}
