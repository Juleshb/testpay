import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getToken } from './auth';
import { getUnreadSummary } from './communityApi';
import { CommunityRealtimeClient } from './lib/communityRealtime';

const CommunityUnreadContext = createContext({
  total: 0,
  channels: {},
  conversations: {},
  refresh: () => {},
});

export function CommunityUnreadProvider({ children }) {
  const [summary, setSummary] = useState({
    total: 0,
    channelTotal: 0,
    dmTotal: 0,
    channels: {},
    conversations: {},
  });

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await getUnreadSummary();
      setSummary(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const client = new CommunityRealtimeClient(token, {
      onMessage: (msg) => {
        if (msg.type === 'unread:update' && msg.summary) {
          setSummary(msg.summary);
        }
        if (msg.type === 'channel:post' || msg.type === 'dm:message') {
          refresh();
        }
      },
    });
    client.connect();

    return () => client.close();
  }, [refresh]);

  return (
    <CommunityUnreadContext.Provider value={{ ...summary, refresh }}>
      {children}
    </CommunityUnreadContext.Provider>
  );
}

export function useCommunityUnread() {
  return useContext(CommunityUnreadContext);
}

export function UnreadBadge({ count, className = '' }) {
  if (!count || count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 rounded-full font-mono text-[10px] font-bold leading-none ${className}`}
      style={{
        background: 'var(--color-accent)',
        color: 'var(--color-on-accent)',
      }}
    >
      {label}
    </span>
  );
}
