import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

export default function SegmentedControl({ options, value, onChange, className }) {
  const { t } = useTranslation();

  return (
    <div
      className={cn('flex gap-1 p-1 rounded-full border', className)}
      style={{
        background: 'var(--color-surface-700)',
        borderColor: 'var(--color-border)',
      }}
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-2 text-sm font-mono rounded-full transition-all duration-150',
            value === opt.value ? 'font-semibold' : ''
          )}
          style={
            value === opt.value
              ? {
                  background: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                  boxShadow: 'inset 0 1px rgba(255,255,255,0.35)',
                }
              : { color: 'var(--color-text-secondary)' }
          }
        >
          {opt.labelKey ? t(opt.labelKey) : opt.label}
        </button>
      ))}
    </div>
  );
}
