import { cn } from '../../lib/cn';
import { TokenIcon } from '../CryptoIcon';

export default function AmountInput({
  value,
  onChange,
  tokenSymbol,
  placeholder = '0.00',
  className,
  disabled,
  ...props
}) {
  return (
    <div
      className={cn(
        'flex items-stretch rounded-xl border overflow-hidden transition-colors',
        'focus-within:border-[color-mix(in_srgb,var(--color-accent)_55%,transparent)]',
        'focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_18%,transparent)]',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      style={{
        background: 'var(--color-surface-700)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="flex items-center justify-center shrink-0 px-3 border-r"
        style={{
          borderColor: 'var(--color-border)',
          background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface-700))',
        }}
      >
        <TokenIcon symbol={tokenSymbol} size={32} />
      </div>

      <input
        type="number"
        step="any"
        min="0.00000001"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 min-w-0 bg-transparent px-4 py-3.5 font-mono text-lg font-semibold tabular-nums outline-none placeholder:opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ color: 'var(--color-text-primary)' }}
        {...props}
      />

      <div
        className="flex items-center shrink-0 px-4 border-l font-mono text-sm font-semibold"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-accent)',
          background: 'color-mix(in srgb, var(--color-surface-800) 50%, transparent)',
        }}
      >
        {tokenSymbol}
      </div>
    </div>
  );
}
