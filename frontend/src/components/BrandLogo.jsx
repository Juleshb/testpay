import { Link } from 'react-router-dom';
import { useId } from 'react';
import { cn } from '../lib/cn';

const SIZE_MAP = {
  xs: { lockup: 'brand-logo-lockup-xs', icon: 16, text: 'text-[13px]' },
  sm: { lockup: 'brand-logo-lockup-sm', icon: 20, text: 'text-sm' },
  md: { lockup: 'brand-logo-lockup-md', icon: 24, text: 'text-base' },
  lg: { lockup: 'brand-logo-lockup-lg', icon: 30, text: 'text-xl' },
  xl: { lockup: 'brand-logo-lockup-xl', icon: 38, text: 'text-2xl' },
};

/** Three stacked layers + upward arrow — earnings stacking motif */
export function StackLayersIcon({ className, size = 24 }) {
  const gradId = useId();

  return (
    <svg
      className={cn('shrink-0', className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="8" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#CFFFE2" />
          <stop offset="1" stopColor="#7FC0AC" />
        </linearGradient>
      </defs>

      <rect x="5" y="21" width="22" height="5" rx="1.5" fill={`url(#${gradId})`} opacity="0.45" />
      <rect x="5" y="15" width="22" height="5" rx="1.5" fill={`url(#${gradId})`} opacity="0.72" />
      <rect x="5" y="9" width="22" height="5" rx="1.5" fill={`url(#${gradId})`} />

      <path
        d="M16 5.5 V8.5 M13.5 7 L16 4.5 L18.5 7"
        stroke="#A2D5C6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full-name logo lockup — stack icon + StackPay inside one badge */
export function BrandWordmark({ size = 'md', variant = 'badge', className }) {
  const config = SIZE_MAP[size] || SIZE_MAP.md;
  const isPlain = variant === 'plain';

  return (
    <div
      className={cn(
        'brand-logo-lockup',
        !isPlain && config.lockup,
        isPlain && 'brand-logo-lockup-plain',
        className
      )}
    >
      <StackLayersIcon size={config.icon} />
      <span className={cn('brand-word leading-none whitespace-nowrap', config.text)}>
        Stack<b>Pay</b>
      </span>
    </div>
  );
}

/** Compact mark — same full name, tighter padding (spinners, small headers) */
export function BrandMark({ className, size = 36 }) {
  const sizeKey =
    size >= 72 ? 'xl' : size >= 52 ? 'lg' : size >= 40 ? 'md' : size >= 28 ? 'sm' : 'xs';

  return <BrandWordmark size={sizeKey} variant="badge" className={className} />;
}

export default function BrandLogo({
  to = '/dashboard',
  size = 'md',
  className,
}) {
  return (
    <Link to={to} className={cn('inline-flex shrink-0', className)}>
      <BrandWordmark size={size} variant="badge" />
    </Link>
  );
}
