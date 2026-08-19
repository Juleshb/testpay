import { prisma } from '../db.js';
import { calcDailyIncome } from './miningAccrual.js';

export const DEFAULT_MINING_OPTIONS = [
  {
    name: 'Free Miner',
    slug: 'free-miner',
    minAmount: '10',
    maxAmount: '10',
    dailyRate: '0.5',
    durationDays: 1,
    sessionHours: 24,
    hashRate: '10 TH/s',
    coin: 'BTC',
    description: 'Free starter miner · 24-hour session · restart when done',
    badgeColor: '#7DCEA0',
    sortOrder: 0,
    isFree: true,
  },
  {
    name: 'Starter Miner',
    slug: 'starter-miner',
    minAmount: '50',
    maxAmount: '499.99',
    dailyRate: '1.0',
    durationDays: 1,
    sessionHours: 24,
    hashRate: '100 TH/s',
    coin: 'BTC',
    description: 'Entry cloud miner · 24-hour session · restart when done',
    badgeColor: '#6B8EAD',
    sortOrder: 1,
    isFree: false,
  },
  {
    name: 'Pro Miner',
    slug: 'pro-miner',
    minAmount: '500',
    maxAmount: '1999.99',
    dailyRate: '1.5',
    durationDays: 1,
    sessionHours: 24,
    hashRate: '500 TH/s',
    coin: 'BTC',
    description: 'Balanced hashrate · 24-hour session · restart when done',
    badgeColor: '#A2D5C6',
    sortOrder: 2,
    isFree: false,
  },
  {
    name: 'Farm Miner',
    slug: 'farm-miner',
    minAmount: '2000',
    maxAmount: '9999.99',
    dailyRate: '2.0',
    durationDays: 1,
    sessionHours: 24,
    hashRate: '2 PH/s',
    coin: 'BTC',
    description: 'Farm-scale power · 24-hour session · restart when done',
    badgeColor: '#E8B86D',
    sortOrder: 3,
    isFree: false,
  },
  {
    name: 'Industrial Miner',
    slug: 'industrial-miner',
    minAmount: '10000',
    maxAmount: null,
    dailyRate: '2.8',
    durationDays: 1,
    sessionHours: 24,
    hashRate: '10 PH/s',
    coin: 'BTC',
    description: 'Industrial tier · 24-hour session · restart when done',
    badgeColor: '#C9A0DC',
    sortOrder: 4,
    isFree: false,
  },
];

export async function bootstrapMining() {
  for (const option of DEFAULT_MINING_OPTIONS) {
    await prisma.miningOption.upsert({
      where: { slug: option.slug },
      create: option,
      update: {
        name: option.name,
        minAmount: option.minAmount,
        maxAmount: option.maxAmount,
        dailyRate: option.dailyRate,
        durationDays: option.durationDays,
        sessionHours: option.sessionHours ?? null,
        hashRate: option.hashRate,
        coin: option.coin,
        description: option.description,
        badgeColor: option.badgeColor,
        sortOrder: option.sortOrder,
        isFree: option.isFree ?? false,
      },
    });
  }
  await backfillStartedIsFree();
  console.log(`Mining options ready (${DEFAULT_MINING_OPTIONS.length} default tiers)`);
}

/** Positions without a MINING_PURCHASE debit were started free (legacy rows before startedIsFree). */
export async function backfillStartedIsFree() {
  const candidates = await prisma.miningPosition.findMany({
    where: { startedIsFree: false },
    select: { id: true },
  });
  if (!candidates.length) return;

  const purchases = await prisma.balanceEntry.findMany({
    where: {
      sourceType: 'MINING_PURCHASE',
      sourceId: { in: candidates.map((p) => p.id) },
    },
    select: { sourceId: true },
  });
  const paidIds = new Set(purchases.map((p) => p.sourceId));

  const freeIds = candidates.filter((p) => !paidIds.has(p.id)).map((p) => p.id);
  if (!freeIds.length) return;

  await prisma.miningPosition.updateMany({
    where: { id: { in: freeIds } },
    data: { startedIsFree: true },
  });
}

export function formatMiningOption(option) {
  return {
    id: option.id,
    name: option.name,
    slug: option.slug,
    minAmount: option.minAmount,
    maxAmount: option.maxAmount,
    dailyRate: option.dailyRate,
    dailyRatePercent: parseFloat(option.dailyRate),
    minDailyIncome: calcDailyIncome(option.minAmount, option.dailyRate),
    durationDays: option.durationDays,
    sessionHours: option.sessionHours ?? null,
    hashRate: option.hashRate,
    coin: option.coin,
    description: option.description,
    badgeColor: option.badgeColor,
    sortOrder: option.sortOrder,
    active: option.active,
    isFree: Boolean(option.isFree),
    createdAt: option.createdAt,
    updatedAt: option.updatedAt,
  };
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validateMiningOptionInput(body, partial = false) {
  const errors = [];
  const data = {};

  if (!partial || body.name !== undefined) {
    if (!body.name?.trim()) errors.push('Name is required');
    else data.name = body.name.trim();
  }
  if (!partial || body.slug !== undefined) {
    data.slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.name || '');
    if (!data.slug) errors.push('Slug is required');
  }
  if (!partial || body.minAmount !== undefined) {
    const min = parseFloat(body.minAmount);
    if (isNaN(min) || min <= 0) errors.push('Valid minAmount is required');
    else data.minAmount = String(min);
  }
  if (body.maxAmount !== undefined) {
    if (body.maxAmount === null || body.maxAmount === '') data.maxAmount = null;
    else {
      const max = parseFloat(body.maxAmount);
      if (isNaN(max) || max <= 0) errors.push('maxAmount must be a positive number');
      else data.maxAmount = String(max);
    }
  }
  if (!partial || body.dailyRate !== undefined) {
    const rate = parseFloat(body.dailyRate);
    if (isNaN(rate) || rate <= 0 || rate > 100) errors.push('dailyRate must be between 0 and 100');
    else data.dailyRate = String(rate);
  }
  if (!partial || body.durationDays !== undefined) {
    const days = parseInt(body.durationDays, 10);
    if (isNaN(days) || days < 1) errors.push('durationDays must be at least 1');
    else data.durationDays = days;
  }
  if (body.sessionHours !== undefined) {
    if (body.sessionHours === null || body.sessionHours === '') {
      data.sessionHours = null;
    } else {
      const hours = parseInt(body.sessionHours, 10);
      if (isNaN(hours) || hours < 1) errors.push('sessionHours must be at least 1');
      else data.sessionHours = hours;
    }
  }
  if (!partial || body.hashRate !== undefined) {
    if (!body.hashRate?.trim()) errors.push('hashRate is required');
    else data.hashRate = body.hashRate.trim();
  }
  if (body.coin !== undefined) data.coin = body.coin?.trim() || 'BTC';
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.badgeColor !== undefined) data.badgeColor = body.badgeColor?.trim() || '#A2D5C6';
  if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder, 10) || 0;
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.isFree !== undefined) data.isFree = Boolean(body.isFree);

  if (data.maxAmount && data.minAmount && parseFloat(data.maxAmount) < parseFloat(data.minAmount)) {
    errors.push('maxAmount must be greater than minAmount');
  }

  return { errors, data };
}
