import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../db.js';

/** @typedef {{ userId: string, user: object, subscriptions: Set<string> }} ClientMeta */

/** @type {Map<import('ws').WebSocket, ClientMeta>} */
const clients = new Map();

/** @type {Map<string, Map<string, { name: string, timer: NodeJS.Timeout }>>} */
const typingByRoom = new Map();

const TYPING_TTL_MS = 3500;

function displayName(user) {
  return user.name || user.email || user.phone || 'User';
}

export function channelRoom(slug) {
  return `channel:${slug}`;
}

export function dmRoom(conversationId) {
  return `dm:${conversationId}`;
}

export function userRoom(userId) {
  return `user:${userId}`;
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room, payload, { exceptUserId = null } = {}) {
  for (const [ws, meta] of clients.entries()) {
    if (exceptUserId && meta.userId === exceptUserId) continue;
    if (!meta.subscriptions.has(room)) continue;
    send(ws, payload);
  }
}

function clearTyping(room, userId) {
  const roomMap = typingByRoom.get(room);
  if (!roomMap) return;
  const entry = roomMap.get(userId);
  if (entry?.timer) clearTimeout(entry.timer);
  roomMap.delete(userId);
  if (roomMap.size === 0) typingByRoom.delete(room);
}

function setTyping(room, userId, name, isTyping) {
  if (!isTyping) {
    clearTyping(room, userId);
    broadcast(room, { type: 'typing', room, userId, name, isTyping: false }, { exceptUserId: userId });
    return;
  }

  let roomMap = typingByRoom.get(room);
  if (!roomMap) {
    roomMap = new Map();
    typingByRoom.set(room, roomMap);
  }

  const existing = roomMap.get(userId);
  if (existing?.timer) clearTimeout(existing.timer);

  roomMap.set(userId, {
    name,
    timer: setTimeout(() => {
      clearTyping(room, userId);
      broadcast(room, { type: 'typing', room, userId, name, isTyping: false }, { exceptUserId: userId });
    }, TYPING_TTL_MS),
  });

  broadcast(room, { type: 'typing', room, userId, name, isTyping: true }, { exceptUserId: userId });
}

async function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, phone: true, role: true, blocked: true, createdAt: true },
    });
    if (!user || user.blocked) return null;
    return user;
  } catch {
    return null;
  }
}

async function canSubscribeDm(userId, conversationId) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return false;
  return conversation.participantA === userId || conversation.participantB === userId;
}

function handleClientMessage(ws, meta, raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }

  if (msg.type === 'subscribe') {
    if (msg.channel) {
      meta.subscriptions.add(channelRoom(String(msg.channel)));
    }
    if (msg.conversationId) {
      const convId = String(msg.conversationId);
      canSubscribeDm(meta.userId, convId).then((ok) => {
        if (ok) meta.subscriptions.add(dmRoom(convId));
      });
    }
    return;
  }

  if (msg.type === 'unsubscribe') {
    if (msg.channel) meta.subscriptions.delete(channelRoom(String(msg.channel)));
    if (msg.conversationId) meta.subscriptions.delete(dmRoom(String(msg.conversationId)));
    return;
  }

  if (msg.type === 'typing') {
    const isTyping = Boolean(msg.isTyping);
    if (msg.channel) {
      const slug = String(msg.channel);
      prisma.communityChannel
        .findUnique({ where: { slug } })
        .then((channel) => {
          if (channel && channel.chatEnabled === false && meta.user.role !== 'ADMIN') return;
          setTyping(channelRoom(slug), meta.userId, displayName(meta.user), isTyping);
        })
        .catch(() => {});
    } else if (msg.conversationId) {
      const convId = String(msg.conversationId);
      const room = dmRoom(convId);
      setTyping(room, meta.userId, displayName(meta.user), isTyping);
      prisma.conversation
        .findUnique({ where: { id: convId } })
        .then((conv) => {
          if (!conv) return;
          const otherId =
            conv.participantA === meta.userId ? conv.participantB : conv.participantA;
          notifyUser(otherId, {
            type: 'typing',
            room,
            conversationId: convId,
            userId: meta.userId,
            name: displayName(meta.user),
            isTyping,
          });
        })
        .catch(() => {});
    }
  }
}

function cleanupClient(ws, meta) {
  for (const room of meta.subscriptions) {
    if (room.startsWith('channel:') || room.startsWith('dm:')) {
      clearTyping(room, meta.userId);
      broadcast(room, {
        type: 'typing',
        room,
        userId: meta.userId,
        name: displayName(meta.user),
        isTyping: false,
      });
    }
  }
  clients.delete(ws);
}

export function initCommunityRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/ws/community' });

  wss.on('connection', async (ws, req) => {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/ws/community', `http://${host}`);
    const token = url.searchParams.get('token');
    const user = await verifyToken(token);

    if (!user) {
      ws.close(4401, 'Unauthorized');
      return;
    }

    const meta = {
      userId: user.id,
      user,
      subscriptions: new Set([userRoom(user.id)]),
    };
    clients.set(ws, meta);

    send(ws, { type: 'connected', userId: user.id });

    ws.on('message', (data) => handleClientMessage(ws, meta, data));
    ws.on('close', () => cleanupClient(ws, meta));
    ws.on('error', () => cleanupClient(ws, meta));
  });

  console.log('Community realtime WebSocket ready (/ws/community)');
}

export function broadcastChannelPost(slug, post) {
  broadcast(channelRoom(slug), { type: 'channel:post', channel: slug, post });
}

export function broadcastChannelReaction(slug, postId, reactions) {
  broadcast(channelRoom(slug), { type: 'channel:reaction', channel: slug, postId, reactions });
}

export function broadcastChannelChat(slug, chatEnabled) {
  broadcast(channelRoom(slug), { type: 'channel:chat', channel: slug, chatEnabled });
}

export function broadcastDmMessage(conversationId, message) {
  const payload = { type: 'dm:message', conversationId, message };
  broadcast(dmRoom(conversationId), payload);
  prisma.conversation
    .findUnique({ where: { id: conversationId } })
    .then((conv) => {
      if (!conv) return;
      notifyUser(conv.participantA, payload);
      notifyUser(conv.participantB, payload);
    })
    .catch(() => {});
}

export function notifyUser(userId, payload) {
  broadcast(userRoom(userId), payload);
}

export function notifyConversationParticipants(conversation, payload) {
  notifyUser(conversation.participantA, payload);
  notifyUser(conversation.participantB, payload);
}
