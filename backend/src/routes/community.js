import { Router } from 'express';
import { prisma } from '../db.js';
import { resolveAvatarUrl } from '../services/avatar.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  broadcastChannelPost,
  broadcastChannelReaction,
  broadcastChannelChat,
  broadcastDmMessage,
  notifyConversationParticipants,
  notifyUser,
} from '../services/communityRealtime.js';
import {
  countChannelUnread,
  countDmUnread,
  getFirstUnreadPostId,
  getFirstUnreadMessageId,
  getUnreadSummary,
  markChannelRead,
  markConversationRead,
} from '../services/communityUnread.js';
import { getOnlinePresence } from '../services/presence.js';

const router = Router();
const MAX_CONTENT = 2000;
const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀'];

router.use(authMiddleware(true));

function displayName(user) {
  if (user.username) return `@${user.username}`;
  return user.name || user.email || user.phone || 'User';
}

function formatPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    displayName: displayName(user),
    role: user.role,
    avatarUrl: resolveAvatarUrl(user),
    createdAt: user.createdAt,
  };
}

function orderedPair(userIdA, userIdB) {
  return userIdA < userIdB
    ? { participantA: userIdA, participantB: userIdB }
    : { participantA: userIdB, participantB: userIdA };
}

function isParticipant(conversation, userId) {
  return conversation.participantA === userId || conversation.participantB === userId;
}

function otherParticipant(conversation, userId) {
  return conversation.participantA === userId ? conversation.userB : conversation.userA;
}

function summarizeReactions(reactions, userId) {
  const map = new Map();
  for (const r of reactions) {
    const entry = map.get(r.emoji) || { emoji: r.emoji, count: 0, reacted: false };
    entry.count += 1;
    if (r.userId === userId) entry.reacted = true;
    map.set(r.emoji, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function summarizeReactionsPublic(reactions) {
  const map = new Map();
  for (const r of reactions) {
    const entry = map.get(r.emoji) || { emoji: r.emoji, count: 0 };
    entry.count += 1;
    map.set(r.emoji, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function formatPostBroadcast(post) {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    channelId: post.channelId,
    channelSlug: post.channel?.slug || 'general',
    authorId: post.userId,
    author: formatPublicUser(post.user),
    reactions: summarizeReactionsPublic(post.reactions || []),
  };
}

function formatDmBroadcast(message) {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    senderId: message.senderId,
    sender: formatPublicUser(message.sender),
    quotedPostId: message.quotedPostId,
    quotedContent: message.quotedContent,
  };
}
function isAdminUser(user) {
  return user?.role === 'ADMIN';
}

function formatPeerWithPresence(user) {
  const { byUserId } = getOnlinePresence();
  const presence = byUserId.get(user.id);
  return {
    ...formatPublicUser(user),
    isOnline: Boolean(presence),
    wsConnected: Boolean(presence?.wsConnected),
    lastSeenAt: presence?.lastSeenAt ?? null,
  };
}

function formatChannel(ch) {
  if (!ch) return null;
  return {
    id: ch.id,
    slug: ch.slug,
    name: ch.name,
    description: ch.description,
    chatEnabled: ch.chatEnabled !== false,
    label: `# ${ch.name}`,
  };
}

function formatPost(post, userId) {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    channelId: post.channelId,
    channelSlug: post.channel?.slug || 'general',
    isOwn: post.userId === userId,
    author: formatPublicUser(post.user),
    reactions: summarizeReactions(post.reactions || [], userId),
  };
}

const userPublicSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
};

router.get('/channels', async (_req, res) => {
  try {
    const channels = await prisma.communityChannel.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json(channels.map(formatChannel));
  } catch (err) {
    console.error('Community channels error:', err);
    res.status(500).json({ error: 'Failed to load channels' });
  }
});

router.get('/feed', async (req, res) => {
  try {
    const slug = String(req.query.channel || 'general');
    const channel = await prisma.communityChannel.findUnique({ where: { slug } });

    const posts = await prisma.communityPost.findMany({
      where:
        slug === 'general' && channel
          ? { OR: [{ channelId: channel.id }, { channelId: null }] }
          : channel
            ? { channelId: channel.id }
            : undefined,
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        user: { select: userPublicSelect },
        channel: true,
        reactions: true,
      },
    });

    res.json({
      channel: formatChannel(channel),
      posts: posts.map((p) => formatPost(p, req.user.id)),
      quickEmojis: QUICK_EMOJIS,
      unreadCount: await countChannelUnread(req.user.id, slug),
      firstUnreadPostId: await getFirstUnreadPostId(req.user.id, slug),
    });
  } catch (err) {
    console.error('Community feed error:', err);
    res.status(500).json({ error: 'Failed to load community feed' });
  }
});

router.post('/feed', async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    const slug = String(req.body.channel || 'general');

    if (!content) return res.status(400).json({ error: 'Message is required' });
    if (content.length > MAX_CONTENT) {
      return res.status(400).json({ error: `Message must be under ${MAX_CONTENT} characters` });
    }

    let channel = await prisma.communityChannel.findUnique({ where: { slug } });
    if (!channel) {
      channel = await prisma.communityChannel.findUnique({ where: { slug: 'general' } });
    }

    if (channel && channel.chatEnabled === false && !isAdminUser(req.user)) {
      return res.status(403).json({ error: 'Chat is off. Only admin can post in this channel.' });
    }

    const post = await prisma.communityPost.create({
      data: {
        userId: req.user.id,
        content,
        channelId: channel?.id,
      },
      include: {
        user: { select: userPublicSelect },
        channel: true,
        reactions: true,
      },
    });

    const formatted = formatPost(post, req.user.id);
    const slugOut = channel?.slug || 'general';
    broadcastChannelPost(slugOut, formatPostBroadcast(post));

    const others = await prisma.user.findMany({
      where: { NOT: { id: req.user.id } },
      select: { id: true },
    });
    for (const u of others) {
      const summary = await getUnreadSummary(u.id);
      notifyUser(u.id, { type: 'unread:update', summary });
    }

    res.status(201).json(formatted);
  } catch (err) {
    console.error('Create community post error:', err);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

router.post('/feed/:postId/reactions', async (req, res) => {
  try {
    const { postId } = req.params;
    const emoji = String(req.body.emoji || '').trim();
    if (!emoji || emoji.length > 8) {
      return res.status(400).json({ error: 'Valid emoji is required' });
    }

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = await prisma.communityPostReaction.findUnique({
      where: {
        postId_userId_emoji: {
          postId,
          userId: req.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.communityPostReaction.delete({ where: { id: existing.id } });
    } else {
      try {
        await prisma.communityPostReaction.create({
          data: { postId, userId: req.user.id, emoji },
        });
      } catch (createErr) {
        // Concurrent double-click: reaction already exists — leave it in place.
        if (createErr.code !== 'P2002') throw createErr;
      }
    }

    const reactions = await prisma.communityPostReaction.findMany({ where: { postId } });
    const postWithChannel = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: { channel: true },
    });
    const slugOut = postWithChannel?.channel?.slug || 'general';
    const publicReactions = summarizeReactionsPublic(reactions);
    broadcastChannelReaction(slugOut, postId, publicReactions);
    res.json({ reactions: summarizeReactions(reactions, req.user.id) });
  } catch (err) {
    console.error('Toggle reaction error:', err);
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

router.get('/unread-summary', async (req, res) => {
  try {
    const summary = await getUnreadSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    console.error('Unread summary error:', err);
    res.status(500).json({ error: 'Failed to load unread summary' });
  }
});

router.patch('/channels/:slug/chat', async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const slug = String(req.params.slug);
    if (typeof req.body.chatEnabled !== 'boolean') {
      return res.status(400).json({ error: 'chatEnabled boolean is required' });
    }
    const chatEnabled = req.body.chatEnabled;
    const channel = await prisma.communityChannel.findUnique({ where: { slug } });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const updated = await prisma.communityChannel.update({
      where: { id: channel.id },
      data: { chatEnabled },
    });

    broadcastChannelChat(updated.slug, updated.chatEnabled);
    res.json(formatChannel(updated));
  } catch (err) {
    console.error('Toggle channel chat error:', err);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

router.post('/channels/:slug/read', async (req, res) => {
  try {
    await markChannelRead(req.user.id, String(req.params.slug));
    const summary = await getUnreadSummary(req.user.id);
    notifyUser(req.user.id, { type: 'unread:update', summary });
    res.json({ ok: true, summary });
  } catch (err) {
    console.error('Mark channel read error:', err);
    res.status(500).json({ error: 'Failed to mark channel read' });
  }
});

router.get('/members', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const { byUserId } = getOnlinePresence();
    const where = { NOT: { id: req.user.id }, blocked: false };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: userPublicSelect,
    });

    const formatted = users.map((user) => {
      const presence = byUserId.get(user.id);
      return {
        ...formatPublicUser(user),
        isOnline: Boolean(presence),
        wsConnected: Boolean(presence?.wsConnected),
        lastSeenAt: presence?.lastSeenAt ?? null,
      };
    });

    formatted.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return displayName(a).localeCompare(displayName(b));
    });

    res.json(formatted);
  } catch (err) {
    console.error('Community members error:', err);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

router.get('/online', async (req, res) => {
  try {
    const { onlineUsers, byUserId } = getOnlinePresence();
    const ids = [...byUserId.keys()].filter((id) => id !== req.user.id);

    if (!ids.length) {
      return res.json({ onlineUsers: 0, users: [] });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: ids }, blocked: false },
      select: userPublicSelect,
    });

    const rows = users
      .map((user) => {
        const presence = byUserId.get(user.id);
        return {
          ...formatPublicUser(user),
          isOnline: true,
          wsConnected: Boolean(presence?.wsConnected),
          lastSeenAt: presence?.lastSeenAt ?? null,
        };
      })
      .sort((a, b) => {
        if (a.wsConnected !== b.wsConnected) return a.wsConnected ? -1 : 1;
        return displayName(a).localeCompare(displayName(b));
      });

    res.json({ onlineUsers: rows.length, users: rows });
  } catch (err) {
    console.error('Community online users error:', err);
    res.status(500).json({ error: 'Failed to load online users' });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participantA: userId }, { participantB: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        userA: { select: userPublicSelect },
        userB: { select: userPublicSelect },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: userPublicSelect } },
        },
      },
    });

    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const last = conv.messages[0];
        const peer = otherParticipant(conv, userId);
        const unreadCount = await countDmUnread(userId, conv.id);
        return {
          id: conv.id,
          peer: formatPeerWithPresence(peer),
          unreadCount,
          lastMessage: last
            ? {
                id: last.id,
                content: last.content,
                createdAt: last.createdAt,
                isOwn: last.senderId === userId,
                sender: formatPublicUser(last.sender),
              }
            : null,
          updatedAt: conv.updatedAt,
        };
      })
    );

    res.json(formatted);
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

router.post('/conversations', async (req, res) => {
  try {
    const { userId: peerId, initialMessage, quotedPostId, quotedContent } = req.body;
    if (!peerId || peerId === req.user.id) {
      return res.status(400).json({ error: 'Valid user is required' });
    }

    const peer = await prisma.user.findUnique({
      where: { id: peerId },
      select: userPublicSelect,
    });
    if (!peer) return res.status(404).json({ error: 'User not found' });

    const pair = orderedPair(req.user.id, peerId);
    const conversation = await prisma.conversation.upsert({
      where: { participantA_participantB: pair },
      create: pair,
      update: {},
      include: {
        userA: { select: userPublicSelect },
        userB: { select: userPublicSelect },
      },
    });

    let lastMessage = null;
    const msgContent = String(initialMessage || '').trim();
    if (msgContent) {
      const message = await prisma.$transaction(async (tx) => {
        const msg = await tx.directMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: req.user.id,
            content: msgContent,
            quotedPostId: quotedPostId || null,
            quotedContent: quotedContent ? String(quotedContent).slice(0, 500) : null,
          },
          include: { sender: { select: userPublicSelect } },
        });
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });
        return msg;
      });
      lastMessage = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        isOwn: true,
        sender: formatPublicUser(message.sender),
      };
    }

    res.json({
      id: conversation.id,
      peer: formatPublicUser(otherParticipant(conversation, req.user.id)),
      lastMessage,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error('Start conversation error:', err);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        userA: { select: userPublicSelect },
        userB: { select: userPublicSelect },
      },
    });

    if (!conversation || !isParticipant(conversation, req.user.id)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await prisma.directMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { sender: { select: userPublicSelect } },
    });

    const firstUnreadMessageId = await getFirstUnreadMessageId(req.user.id, conversation.id);

    await markConversationRead(req.user.id, conversation.id);
    const summary = await getUnreadSummary(req.user.id);
    notifyUser(req.user.id, { type: 'unread:update', summary });

    res.json({
      id: conversation.id,
      peer: formatPeerWithPresence(otherParticipant(conversation, req.user.id)),
      firstUnreadMessageId,
      unreadCount: firstUnreadMessageId
        ? messages.filter((m) => m.senderId !== req.user.id && !m.readAt).length
        : 0,
      messages: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        isOwn: msg.senderId === req.user.id,
        sender: formatPublicUser(msg.sender),
        quotedPostId: msg.quotedPostId,
        quotedContent: msg.quotedContent,
      })),
    });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Message is required' });
    if (content.length > MAX_CONTENT) {
      return res.status(400).json({ error: `Message must be under ${MAX_CONTENT} characters` });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
    });

    if (!conversation || !isParticipant(conversation, req.user.id)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.directMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user.id,
          content,
          quotedPostId: req.body.quotedPostId || null,
          quotedContent: req.body.quotedContent ? String(req.body.quotedContent).slice(0, 500) : null,
        },
        include: { sender: { select: userPublicSelect } },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
      return msg;
    });

    const payload = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      isOwn: true,
      sender: formatPublicUser(message.sender),
      quotedPostId: message.quotedPostId,
      quotedContent: message.quotedContent,
    };

    broadcastDmMessage(conversation.id, formatDmBroadcast(message));
    notifyConversationParticipants(conversation, {
      type: 'conversations:update',
      conversationId: conversation.id,
    });

    const peerId =
      conversation.participantA === req.user.id
        ? conversation.participantB
        : conversation.participantA;
    const peerSummary = await getUnreadSummary(peerId);
    notifyUser(peerId, { type: 'unread:update', summary: peerSummary });

    res.status(201).json(payload);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
