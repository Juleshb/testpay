import { prisma } from '../db.js';

export const DEFAULT_CHANNELS = [
  {
    slug: 'general',
    name: 'general',
    description: 'Community-wide announcements and discussion',
    sortOrder: 1,
  },
  {
    slug: 'trading',
    name: 'trading',
    description: 'Payments, packages, and investment talk',
    sortOrder: 2,
  },
];

export async function bootstrapCommunity() {
  for (const ch of DEFAULT_CHANNELS) {
    await prisma.communityChannel.upsert({
      where: { slug: ch.slug },
      create: ch,
      update: {
        name: ch.name,
        description: ch.description,
        sortOrder: ch.sortOrder,
      },
    });
  }

  const general = await prisma.communityChannel.findUnique({ where: { slug: 'general' } });
  if (general) {
    await prisma.communityPost.updateMany({
      where: { channelId: null },
      data: { channelId: general.id },
    });
  }

  console.log(`Community channels ready (${DEFAULT_CHANNELS.length} channels)`);
}

export async function getGeneralChannelId() {
  const ch = await prisma.communityChannel.findUnique({ where: { slug: 'general' } });
  return ch?.id;
}
