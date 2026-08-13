import { prisma } from '../db.js';
import { calcDailyIncome } from './packageAccrual.js';

export const DEFAULT_PACKAGES = [
  {
    name: 'Bronze Package',
    slug: 'bronze',
    minAmount: '50',
    maxAmount: '499.99',
    dailyRate: '0.8',
    durationDays: 30,
    description: 'Entry tier · steady daily returns',
    badgeColor: '#CD7F32',
    sortOrder: 1,
  },
  {
    name: 'Silver Package',
    slug: 'silver',
    minAmount: '500',
    maxAmount: '1999.99',
    dailyRate: '1.2',
    durationDays: 60,
    description: 'Balanced growth · higher daily rate',
    badgeColor: '#C0C0C0',
    sortOrder: 2,
  },
  {
    name: 'Gold Package',
    slug: 'gold',
    minAmount: '2000',
    maxAmount: '9999.99',
    dailyRate: '1.8',
    durationDays: 90,
    description: 'Premium tier · accelerated income',
    badgeColor: '#FFD700',
    sortOrder: 3,
  },
  {
    name: 'Platinum Package',
    slug: 'platinum',
    minAmount: '10000',
    maxAmount: null,
    dailyRate: '2.5',
    durationDays: 120,
    description: 'Elite tier · maximum daily yield',
    badgeColor: '#A2D5C6',
    sortOrder: 4,
  },
];

export async function bootstrapPackages() {
  for (const pkg of DEFAULT_PACKAGES) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      create: pkg,
      update: {
        name: pkg.name,
        minAmount: pkg.minAmount,
        maxAmount: pkg.maxAmount,
        dailyRate: pkg.dailyRate,
        durationDays: pkg.durationDays,
        description: pkg.description,
        badgeColor: pkg.badgeColor,
        sortOrder: pkg.sortOrder,
      },
    });
  }
  console.log(`Investment packages ready (${DEFAULT_PACKAGES.length} default tiers)`);
}

export function formatPackage(pkg) {
  return {
    id: pkg.id,
    name: pkg.name,
    slug: pkg.slug,
    minAmount: pkg.minAmount,
    maxAmount: pkg.maxAmount,
    dailyRate: pkg.dailyRate,
    dailyRatePercent: parseFloat(pkg.dailyRate),
    minDailyIncome: calcDailyIncome(pkg.minAmount, pkg.dailyRate),
    durationDays: pkg.durationDays,
    description: pkg.description,
    badgeColor: pkg.badgeColor,
    sortOrder: pkg.sortOrder,
    active: pkg.active,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validatePackageInput(body, partial = false) {
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
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.badgeColor !== undefined) data.badgeColor = body.badgeColor?.trim() || '#A2D5C6';
  if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder, 10) || 0;
  if (body.active !== undefined) data.active = Boolean(body.active);

  if (data.maxAmount && data.minAmount && parseFloat(data.maxAmount) < parseFloat(data.minAmount)) {
    errors.push('maxAmount must be greater than minAmount');
  }

  return { errors, data };
}
