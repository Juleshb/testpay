const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/** @type {Map<string, number>} */
const lastSeen = new Map();

/** @type {Map<string, number>} */
const wsConnections = new Map();

function prune() {
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  for (const [userId, ts] of lastSeen) {
    if (ts < cutoff && !wsConnections.has(userId)) {
      lastSeen.delete(userId);
    }
  }
}

export function touchPresence(userId) {
  if (!userId) return;
  lastSeen.set(userId, Date.now());
}

export function wsConnected(userId) {
  if (!userId) return;
  touchPresence(userId);
  wsConnections.set(userId, (wsConnections.get(userId) || 0) + 1);
}

export function wsDisconnected(userId) {
  if (!userId) return;
  const next = (wsConnections.get(userId) || 1) - 1;
  if (next <= 0) wsConnections.delete(userId);
  else wsConnections.set(userId, next);
}

export function getOnlinePresence() {
  prune();
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  /** @type {Map<string, { lastSeenAt: string, wsConnected: boolean }>} */
  const byUserId = new Map();

  for (const [userId, ts] of lastSeen) {
    if (ts >= cutoff || wsConnections.has(userId)) {
      byUserId.set(userId, {
        lastSeenAt: new Date(ts).toISOString(),
        wsConnected: wsConnections.has(userId),
      });
    }
  }

  for (const userId of wsConnections.keys()) {
    if (!byUserId.has(userId)) {
      byUserId.set(userId, {
        lastSeenAt: new Date(lastSeen.get(userId) || Date.now()).toISOString(),
        wsConnected: true,
      });
    }
  }

  return { onlineUsers: byUserId.size, byUserId };
}

export function getOnlineStats() {
  return { onlineUsers: getOnlinePresence().onlineUsers };
}
