const PREF_KEY = 'stackpay_message_notifications';

export function getMessageNotifyPref() {
  const v = localStorage.getItem(PREF_KEY);
  if (v === '0') return false;
  if (v === '1') return true;
  // Default on once permission is granted
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

export function setMessageNotifyPref(enabled) {
  localStorage.setItem(PREF_KEY, enabled ? '1' : '0');
}

export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestMessageNotificationPermission() {
  if (typeof Notification === 'undefined') {
    return { ok: false, permission: 'unsupported' };
  }
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission === 'granted') {
    setMessageNotifyPref(true);
  }
  return { ok: permission === 'granted', permission };
}

/** Update installed PWA / browser app icon badge with unread count. */
export async function syncAppBadge(count) {
  try {
    const n = Math.max(0, Number(count) || 0);
    if ('setAppBadge' in navigator) {
      if (n > 0) await navigator.setAppBadge(n);
      else if ('clearAppBadge' in navigator) await navigator.clearAppBadge();
    }
  } catch {
    /* unsupported / denied */
  }
}

export async function clearAppBadge() {
  try {
    if ('clearAppBadge' in navigator) await navigator.clearAppBadge();
    else if ('setAppBadge' in navigator) await navigator.setAppBadge(0);
  } catch {
    /* ignore */
  }
}

function isDocumentHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

/**
 * Show an OS notification for a new DM when the user isn't looking at the app.
 * Uses the service worker when available so the installed PWA can display it.
 */
export async function notifyIncomingMessage({
  title,
  body,
  url = '/community',
  tag = 'stackpay-dm',
} = {}) {
  if (!getMessageNotifyPref()) return false;
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  // Only alert when app is in background / another tab
  if (!isDocumentHidden()) return false;

  const options = {
    body: body || 'You have a new message',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag,
    renotify: true,
    data: { url },
  };

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) {
      await reg.showNotification(title || 'StackPay', options);
      return true;
    }
  } catch {
    /* fall through */
  }

  try {
    // eslint-disable-next-line no-new
    new Notification(title || 'StackPay', options);
    return true;
  } catch {
    return false;
  }
}

export function extractDmNotifyPayload(msg) {
  if (!msg || msg.type !== 'dm:message') return null;
  const message = msg.message || {};
  const sender = message.sender || {};
  const name =
    sender.displayName ||
    (sender.username ? `@${sender.username}` : null) ||
    sender.name ||
    'Someone';
  const text = String(message.content || '').trim();
  const preview = text.length > 120 ? `${text.slice(0, 117)}…` : text;
  const conversationId = msg.conversationId || message.conversationId;
  return {
    title: name,
    body: preview || 'New message',
    url: '/community',
    tag: `stackpay-dm-${conversationId || message.id || 'new'}`,
  };
}
