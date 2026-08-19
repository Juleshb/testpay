import { useEffect } from 'react';
import { authHeaders } from '../auth';

export function usePresenceHeartbeat(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const ping = () => {
      fetch('/api/auth/presence', { method: 'POST', headers: authHeaders() }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [enabled]);
}
