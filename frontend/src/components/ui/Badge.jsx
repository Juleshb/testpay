import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { useAuth } from '../../AuthContext';
import { getDisplayStatus, getStatusVariant } from '../../constants/status';

export default function Badge({ status, children, className, admin }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = admin ?? user?.role === 'ADMIN';
  const displayStatus = status ? getDisplayStatus(status, isAdmin) : null;
  const variant = displayStatus ? getStatusVariant(displayStatus) : null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border',
        variant?.badge ||
          'bg-[var(--color-surface-700)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
        className
      )}
    >
      {variant && <span className={cn('w-1.5 h-1.5 rounded-full', variant.dot)} />}
      {children ||
        (displayStatus &&
          t(`status.${displayStatus.toLowerCase()}`, {
            defaultValue: displayStatus?.toLowerCase(),
          }))}
    </span>
  );
}
