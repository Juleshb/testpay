import UserAvatar from './UserAvatar';
import { cn } from '../../lib/cn';

export default function OnlineMemberAvatar({ online = false, size = 40, className, ...avatarProps }) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <UserAvatar size={size} {...avatarProps} />
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full mining-live-dot"
          style={{
            background: 'var(--color-success)',
            boxShadow: '0 0 0 2px var(--color-surface-800)',
          }}
          aria-hidden
        />
      )}
    </span>
  );
}
