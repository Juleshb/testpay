import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getToken } from './auth';
import { useAuth } from './AuthContext';
import { getUnreadSummary } from './communityApi';
import { CommunityRealtimeClient } from './lib/communityRealtime';
import {
  clearAppBadge,
  extractDmNotifyPayload,
  notifyIncomingMessage,
  syncAppBadge,
} from './lib/messageNotifications';

const CommunityUnreadContext = createContext({
  total: 0,
  channels: {},
  conversations: {},
  refresh: () => {},
});

export function CommunityUnreadProvider({ children }) {
  const { user } = useAuth();
  const myUserId = user?.id || null;
  const [summary, setSummary] = useState({
    total: 0,
    channelTotal: 0,
    dmTotal: 0,
    channels: {},
    conversations: {},
  });
  const applySummary = useCallback((data) => {
    if (!data) return;
    setSummary(data);
    syncAppBadge(data.total || 0);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      clearAppBadge();
      return;
    }
    try {
      const data = await getUnreadSummary();
      applySummary(data);
    } catch {
      /* ignore */
    }
  }, [applySummary]);

  useEffect(() => {
    if (!getToken() || !myUserId) {
      clearAppBadge();
      setSummary({
        total: 0,
        channelTotal: 0,
        dmTotal: 0,
        channels: {},
        conversations: {},
      });
      return undefined;
    }

    refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, [refresh, myUserId]);

  useEffect(() => {
    const token = getToken();
    if (!token || !myUserId) return undefined;

    const client = new CommunityRealtimeClient(token, {
      onMessage: (msg) => {
        if (msg.type === 'unread:update' && msg.summary) {
          applySummary(msg.summary);
        }
        if (msg.type === 'channel:post' || msg.type === 'dm:message') {
          refresh();
        }
        if (msg.type === 'dm:message') {
          const message = msg.message || {};
          if (message.senderId && message.senderId === myUserId) return;
          const payload = extractDmNotifyPayload(msg);
          if (payload) {
            notifyIncomingMessage({
              ...payload,
              url: '/community',
            });
          }
        }
      },
    });
    client.connect();

    return () => client.close();
  }, [refresh, applySummary, myUserId]);

  // Keep badge in sync when returning to the app
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && getToken()) {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
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
