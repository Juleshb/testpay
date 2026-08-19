import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getOnlineUsers } from '../publicApi';
import { cn } from '../lib/cn';

export default function OnlineUsersBadge({ className, compact = false }) {
  const { t } = useTranslation();
  const [count, setCount] = useState(null);

  useEffect(() => {
    const load = () =>
      getOnlineUsers()
        .then((data) => setCount(data.onlineUsers))
        .catch(() => {});

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (count == null) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-xs tabular-nums',
        className
      )}
      title={t('landing.onlineNow')}
    >
      <span
        className="mining-live-dot inline-block h-2 w-2 rounded-full shrink-0"
        style={{ background: 'var(--color-success)' }}
        aria-hidden
      />
      {compact ? count : t('landing.onlineUsers', { count })}
    </span>
  );
}
