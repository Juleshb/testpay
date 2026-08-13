import { prisma } from '../db.js';
import { normalizeAvatarUrl, resolveAvatarUrl } from './avatar.js';

const DEFAULT_TESTIMONIALS = [
  {
    name: 'Marcus T.',
    role: 'Package investor',
    quote:
      'I funded with USDC on Polygon and had my balance ready the same day. Daily package income shows up automatically — no spreadsheets.',
    rating: 5,
    sortOrder: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=face',
  },
  {
    name: 'Priya K.',
    role: 'Referral member',
    quote:
      'The invite program actually pays. I shared my code, my friend invested, and the commission landed in my balance right away.',
    rating: 5,
    sortOrder: 1,
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&h=256&fit=crop&crop=face',
  },
  {
    name: 'Daniel R.',
    role: 'Withdrawal user',
    quote:
      'Withdrawals to my saved wallet are straightforward. Pick USDC, choose the network, and the payout queue is easy to track.',
    rating: 5,
    sortOrder: 2,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=crop&crop=face',
  },
  {
    name: 'Elena V.',
    role: 'Community member',
    quote:
      'Community chat keeps our team aligned. Profile photos and DMs make it feel like a real product, not just another crypto form.',
    rating: 4,
    sortOrder: 3,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=face',
  },
];

function clampRating(value) {
  const rating = Number.parseInt(String(value), 10);
  if (Number.isNaN(rating)) return 5;
  return Math.min(5, Math.max(1, rating));
}

export function formatTestimonial(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    quote: row.quote,
    rating: clampRating(row.rating),
    avatarUrl: resolveAvatarUrl({
      id: row.id,
      name: row.name,
      avatarUrl: row.avatarUrl,
    }),
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

export async function listActiveTestimonials() {
  const rows = await prisma.showcaseTestimonial.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: 24,
  });
  return rows.map(formatTestimonial);
}

export async function listAllTestimonials() {
  const rows = await prisma.showcaseTestimonial.findMany({
    orderBy: [{ active: 'asc' }, { createdAt: 'desc' }],
  });
  return rows.map((row) => ({
    ...formatTestimonial(row),
    publicSubmission: row.publicSubmission,
    createdAt: row.createdAt,
  }));
}

export async function submitPublicTestimonial(input) {
  const name = String(input.name || '').trim();
  const quote = String(input.quote || '').trim();
  const role = String(input.role || '').trim() || 'StackPay member';

  if (!name) throw new Error('Name is required');
  if (name.length > 80) throw new Error('Name must be 80 characters or less');
  if (!quote) throw new Error('Review is required');
  if (quote.length < 10) throw new Error('Review must be at least 10 characters');
  if (quote.length > 500) throw new Error('Review must be 500 characters or less');

  const rating = clampRating(input.rating);
  if (input.rating === undefined || input.rating === null || input.rating === '') {
    throw new Error('Rating is required');
  }

  const pendingCount = await prisma.showcaseTestimonial.count({
    where: { publicSubmission: true, active: false },
  });
  const sortOrder = 1000 + pendingCount;

  const row = await prisma.showcaseTestimonial.create({
    data: {
      name,
      role,
      quote,
      rating,
      sortOrder,
      active: false,
      publicSubmission: true,
    },
  });

  return formatTestimonial(row);
}

export async function createShowcaseTestimonial(input) {
  const data = validateTestimonialInput(input);
  const row = await prisma.showcaseTestimonial.create({
    data: { ...data, publicSubmission: false },
  });
  return formatTestimonial(row);
}

export async function updateShowcaseTestimonial(id, input) {
  const data = validateTestimonialInput(input, { partial: true });
  if (Object.keys(data).length === 0) {
    throw new Error('No fields to update');
  }
  const row = await prisma.showcaseTestimonial.update({
    where: { id },
    data,
  });
  return formatTestimonial(row);
}

export async function deleteShowcaseTestimonial(id) {
  await prisma.showcaseTestimonial.delete({ where: { id } });
}

export function averageRating(testimonials) {
  if (!testimonials.length) return 0;
  const sum = testimonials.reduce((acc, item) => acc + item.rating, 0);
  return Math.round((sum / testimonials.length) * 10) / 10;
}

function validateTestimonialInput(input, { partial = false } = {}) {
  const payload = {};

  if (!partial || input.name !== undefined) {
    const name = String(input.name || '').trim();
    if (!name) throw new Error('Name is required');
    payload.name = name;
  }

  if (input.role !== undefined) {
    const role = String(input.role || '').trim();
    payload.role = role || null;
  }

  if (!partial || input.quote !== undefined) {
    const quote = String(input.quote || '').trim();
    if (!quote) throw new Error('Quote is required');
    if (quote.length > 500) throw new Error('Quote must be 500 characters or less');
    payload.quote = quote;
  }

  if (input.rating !== undefined) {
    payload.rating = clampRating(input.rating);
  }

  if (input.avatarUrl !== undefined) {
    payload.avatarUrl = normalizeAvatarUrl(input.avatarUrl);
  }

  if (input.sortOrder !== undefined) {
    const sortOrder = Number.parseInt(String(input.sortOrder), 10);
    if (Number.isNaN(sortOrder)) throw new Error('Sort order must be a number');
    payload.sortOrder = sortOrder;
  }

  if (input.active !== undefined) {
    payload.active = Boolean(input.active);
  }

  return payload;
}

export async function bootstrapShowcaseTestimonials() {
  const count = await prisma.showcaseTestimonial.count();
  if (count === 0) {
    await prisma.showcaseTestimonial.createMany({ data: DEFAULT_TESTIMONIALS });
    console.log(`Showcase testimonials ready (${DEFAULT_TESTIMONIALS.length} default reviews)`);
    return;
  }

  const defaultsByName = new Map(DEFAULT_TESTIMONIALS.map((item) => [item.name, item]));
  const existing = await prisma.showcaseTestimonial.findMany({
    where: { name: { in: [...defaultsByName.keys()] } },
    select: { id: true, name: true, avatarUrl: true },
  });

  let updated = 0;
  for (const row of existing) {
    const defaults = defaultsByName.get(row.name);
    if (!defaults?.avatarUrl || row.avatarUrl) continue;
    await prisma.showcaseTestimonial.update({
      where: { id: row.id },
      data: { avatarUrl: defaults.avatarUrl },
    });
    updated += 1;
  }

  if (updated > 0) {
    console.log(`Showcase testimonial photos updated (${updated} review(s))`);
  }
}

export { validateTestimonialInput };
