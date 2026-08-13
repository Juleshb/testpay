export function channelRoom(slug) {
  return `channel:${slug}`;
}

export function dmRoom(conversationId) {
  return `dm:${conversationId}`;
}

function wsUrl(token) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws/community?token=${encodeURIComponent(token)}`;
}

export class CommunityRealtimeClient {
  constructor(token, handlers = {}) {
    this.token = token;
    this.handlers = handlers;
    this.ws = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.shouldReconnect = true;
    this.subscribedChannels = new Set();
    this.subscribedConversations = new Set();
  }

  connect() {
    if (!this.token) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(wsUrl(this.token));

    this.ws.onopen = () => {
      this.connected = true;
      this.resubscribeAll();
      this.handlers.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      this.handlers.onMessage?.(msg);
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.handlers.onDisconnect?.();
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 2500);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  resubscribeAll() {
    for (const slug of this.subscribedChannels) {
      this.send({ type: 'subscribe', channel: slug });
    }
    for (const conversationId of this.subscribedConversations) {
      this.send({ type: 'subscribe', conversationId });
    }
  }

  send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  subscribeChannel(slug) {
    if (!slug) return;
    this.subscribedChannels.add(slug);
    this.send({ type: 'subscribe', channel: slug });
  }

  unsubscribeChannel(slug) {
    if (!slug) return;
    this.subscribedChannels.delete(slug);
    this.send({ type: 'unsubscribe', channel: slug });
  }

  subscribeConversation(conversationId) {
    if (!conversationId) return;
    this.subscribedConversations.add(conversationId);
    this.send({ type: 'subscribe', conversationId });
  }

  unsubscribeConversation(conversationId) {
    if (!conversationId) return;
    this.subscribedConversations.delete(conversationId);
    this.send({ type: 'unsubscribe', conversationId });
  }

  sendTyping({ channel, conversationId, isTyping }) {
    this.send({ type: 'typing', channel, conversationId, isTyping });
  }

  close() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.subscribedChannels.clear();
    this.subscribedConversations.clear();
  }
}

export function mergeReactionCounts(existing = [], incoming = [], userId, myUserId) {
  return incoming.map((r) => {
    const prev = existing.find((e) => e.emoji === r.emoji);
    const reacted = prev?.reacted ?? false;
    return { ...r, reacted: userId === myUserId ? reacted : false };
  });
}

export function normalizeIncomingPost(post, myUserId) {
  return {
    ...post,
    isOwn: post.authorId === myUserId,
    reactions: (post.reactions || []).map((r) => ({ ...r, reacted: false })),
  };
}

export function normalizeIncomingDm(message, myUserId) {
  return {
    ...message,
    isOwn: message.senderId === myUserId,
  };
}
