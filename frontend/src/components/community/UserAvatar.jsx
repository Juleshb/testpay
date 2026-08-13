import { useState } from 'react';
import { cn } from '../../lib/cn';

const PALETTE = ['#A2D5C6', '#7FC0AC', '#C0C0C0', '#FFD700', '#CD7F32', '#7EB8FF'];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

export function defaultAvatarUrl(userId, name) {
  const seed = encodeURIComponent(userId || name || 'guest');
  return `https://api.dicebear.com/9.x/notionists/png?seed=${seed}&size=128&backgroundColor=0b0b0b,141918&backgroundType=gradientLinear`;
}

export default function UserAvatar({ name, avatarUrl, userId, size = 40, className }) {
  const label = name || '?';
  const [imageFailed, setImageFailed] = useState(false);
  const color = PALETTE[hashCode(userId || label) % PALETTE.length];
  const px = `${size}px`;
  const fontSize = size <= 32 ? '0.55rem' : '0.65rem';
  const src = !imageFailed ? avatarUrl || defaultAvatarUrl(userId, label) : null;

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
        className={cn('inline-flex shrink-0 rounded-full object-cover', className)}
        style={{
          width: px,
          height: px,
          border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
          background: 'var(--color-surface-700)',
        }}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold uppercase',
        className
      )}
      style={{
        width: px,
        height: px,
        fontSize,
        background: `color-mix(in srgb, ${color} 28%, var(--color-surface-700))`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
      }}
      aria-hidden
    >
      {label.slice(0, 2)}
    </span>
  );
}
