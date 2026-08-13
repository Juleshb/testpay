import { prisma } from '../db.js';

async function getChannelBySlug(slug) {
  return prisma.communityChannel.findUnique({ where: { slug } });
}

async function getLastReadAt(userId, channelId) {
  const row = await prisma.communityChannelRead.findUnique({
    where: { userId_channelId: { userId, channelId } },
  });
  return row?.lastReadAt ?? new Date(0);
}

function channelPostFilter(channel, slug, userId, afterDate) {
  const base = {
    createdAt: { gt: afterDate },
    userId: { not: userId },
  };
  if (slug === 'general' && channel) {
    return { ...base, OR: [{ channelId: channel.id }, { channelId: null }] };
  }
  if (channel) {
    return { ...base, channelId: channel.id };
  }
  return base;
}

export async function countChannelUnread(userId, slug) {
  const channel = await getChannelBySlug(slug);
  if (!channel && slug !== 'general') return 0;
  const general = slug === 'general' ? channel || (await getChannelBySlug('general')) : channel;
  const channelId = general?.id;
  if (!channelId) return 0;

  const lastReadAt = await getLastReadAt(userId, channelId);
  return prisma.communityPost.count({
    where: channelPostFilter(general, slug, userId, lastReadAt),
  });
}

export async function getFirstUnreadPostId(userId, slug) {
  const channel = await getChannelBySlug(slug);
  if (!channel && slug !== 'general') return null;
  const general = slug === 'general' ? channel || (await getChannelBySlug('general')) : channel;
  const channelId = general?.id;
  if (!channelId) return null;

  const lastReadAt = await getLastReadAt(userId, channelId);
  const post = await prisma.communityPost.findFirst({
    where: channelPostFilter(general, slug, userId, lastReadAt),
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return post?.id ?? null;
}

export async function markChannelRead(userId, slug) {
  let target = await getChannelBySlug(slug);
  if (!target && slug === 'general') {
    target = await getChannelBySlug('general');
  }
  if (!target) return;

  await prisma.communityChannelRead.upsert({
    where: { userId_channelId: { userId, channelId: target.id } },
    create: { userId, channelId: target.id, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

export async function countDmUnread(userId, conversationId) {
  return prisma.directMessage.count({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
  });
}

export async function getFirstUnreadMessageId(userId, conversationId) {
  const msg = await prisma.directMessage.findFirst({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return msg?.id ?? null;
}

export async function markConversationRead(userId, conversationId) {
  await prisma.directMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export async function getUnreadSummary(userId) {
  const channels = await prisma.communityChannel.findMany({ orderBy: { sortOrder: 'asc' } });
  const channelCounts = {};
  let channelTotal = 0;

  for (const ch of channels) {
    const count = await countChannelUnread(userId, ch.slug);
    if (count > 0) {
      channelCounts[ch.slug] = count;
      channelTotal += count;
    }
  }

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ participantA: userId }, { participantB: userId }] },
    select: { id: true },
  });

  const conversationCounts = {};
  let dmTotal = 0;
  for (const conv of conversations) {
    const count = await countDmUnread(userId, conv.id);
    if (count > 0) {
      conversationCounts[conv.id] = count;
      dmTotal += count;
    }
  }

  return {
    total: channelTotal + dmTotal,
    channelTotal,
    dmTotal,
    channels: channelCounts,
    conversations: conversationCounts,
  };
}
