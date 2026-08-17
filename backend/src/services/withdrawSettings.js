import { prisma } from '../db.js';
import { config } from '../config/index.js';

const DEFAULTS = {
  minWithdrawUsd: String(config.minWithdrawUsd || 5),
  maxWithdrawUsd: String(config.maxWithdrawUsd || 50000),
  maxWithdrawUsdPerDay: String(config.maxWithdrawUsd || 50000),
  maxWithdrawalsPerDay: 5,
  feePercent: '0',
  feeFlatUsd: '0',
};

function toNum(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatWithdrawSettings(row) {
  return {
    withdrawalsEnabled: row.withdrawalsEnabled !== false,
    minWithdrawUsd: toNum(row.minWithdrawUsd, 5).toFixed(2),
    maxWithdrawUsd: toNum(row.maxWithdrawUsd, 50000).toFixed(2),
    maxWithdrawUsdPerDay: toNum(row.maxWithdrawUsdPerDay, 50000).toFixed(2),
    maxWithdrawalsPerDay: Math.max(1, parseInt(row.maxWithdrawalsPerDay, 10) || 5),
    feePercent: toNum(row.feePercent, 0).toFixed(2),
    feeFlatUsd: toNum(row.feeFlatUsd, 0).toFixed(2),
    updatedAt: row.updatedAt,
  };
}

export function calcWithdrawFee(amountUsd, settings) {
  const amount = toNum(amountUsd);
  const percent = toNum(settings.feePercent);
  const flat = toNum(settings.feeFlatUsd);
  const fee = Math.max(0, flat + (amount * percent) / 100);
  const rounded = Math.min(amount, Math.round(fee * 100) / 100);
  const net = Math.max(0, Math.round((amount - rounded) * 100) / 100);
  return {
    feeUsd: rounded.toFixed(2),
    netAmountUsd: net.toFixed(2),
    feePercent: percent.toFixed(2),
    feeFlatUsd: flat.toFixed(2),
  };
}

export async function getWithdrawSettings(tx = prisma) {
  let row = await tx.withdrawSettings.findUnique({ where: { id: 1 } });
  if (!row) {
    row = await tx.withdrawSettings.create({
      data: {
        id: 1,
        ...DEFAULTS,
      },
    });
  }
  return formatWithdrawSettings(row);
}

export async function updateWithdrawSettings(input) {
  const minWithdrawUsd = toNum(input.minWithdrawUsd);
  const maxWithdrawUsd = toNum(input.maxWithdrawUsd);
  const maxWithdrawUsdPerDay = toNum(input.maxWithdrawUsdPerDay);
  const maxWithdrawalsPerDay = parseInt(input.maxWithdrawalsPerDay, 10);
  const feePercent = toNum(input.feePercent);
  const feeFlatUsd = toNum(input.feeFlatUsd);

  const errors = [];
  if (!(minWithdrawUsd > 0)) errors.push('Minimum withdraw must be greater than 0');
  if (!(maxWithdrawUsd >= minWithdrawUsd)) errors.push('Maximum withdraw must be >= minimum');
  if (!(maxWithdrawUsdPerDay >= minWithdrawUsd)) {
    errors.push('Daily maximum must be >= minimum withdraw');
  }
  if (!Number.isInteger(maxWithdrawalsPerDay) || maxWithdrawalsPerDay < 1 || maxWithdrawalsPerDay > 100) {
    errors.push('Daily withdrawal count must be between 1 and 100');
  }
  if (feePercent < 0 || feePercent > 50) errors.push('Fee percent must be between 0 and 50');
  if (feeFlatUsd < 0 || feeFlatUsd > 1000) errors.push('Flat fee must be between 0 and 1000');

  if (errors.length) {
    const err = new Error(errors.join(', '));
    err.status = 400;
    throw err;
  }

  const existing = await prisma.withdrawSettings.findUnique({ where: { id: 1 } });
  const withdrawalsEnabled =
    typeof input.withdrawalsEnabled === 'boolean'
      ? input.withdrawalsEnabled
      : existing?.withdrawalsEnabled !== false;

  const row = await prisma.withdrawSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      withdrawalsEnabled,
      minWithdrawUsd: minWithdrawUsd.toFixed(2),
      maxWithdrawUsd: maxWithdrawUsd.toFixed(2),
      maxWithdrawUsdPerDay: maxWithdrawUsdPerDay.toFixed(2),
      maxWithdrawalsPerDay,
      feePercent: feePercent.toFixed(2),
      feeFlatUsd: feeFlatUsd.toFixed(2),
    },
    update: {
      withdrawalsEnabled,
      minWithdrawUsd: minWithdrawUsd.toFixed(2),
      maxWithdrawUsd: maxWithdrawUsd.toFixed(2),
      maxWithdrawUsdPerDay: maxWithdrawUsdPerDay.toFixed(2),
      maxWithdrawalsPerDay,
      feePercent: feePercent.toFixed(2),
      feeFlatUsd: feeFlatUsd.toFixed(2),
    },
  });

  return formatWithdrawSettings(row);
}

export function startOfRollingDay(now = new Date()) {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000);
}

export async function getUserWithdrawUsage(userId, tx = prisma, since = startOfRollingDay()) {
  const rows = await tx.withdrawal.findMany({
    where: {
      userId,
      createdAt: { gte: since },
      status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
    },
    select: { amountUsd: true },
  });

  const count = rows.length;
  const volumeUsd = rows.reduce((sum, row) => sum + toNum(row.amountUsd), 0);
  return {
    count,
    volumeUsd: volumeUsd.toFixed(2),
    since,
  };
}

export async function getWithdrawFeeStats(tx = prisma) {
  const completed = await tx.withdrawal.findMany({
    where: { status: 'COMPLETED' },
    select: { feeUsd: true, amountUsd: true, netAmountUsd: true },
  });

  let fees = 0;
  let volume = 0;
  for (const row of completed) {
    fees += toNum(row.feeUsd);
    volume += toNum(row.amountUsd);
  }

  return {
    completedCount: completed.length,
    totalFeesUsd: fees.toFixed(2),
    totalVolumeUsd: volume.toFixed(2),
  };
}
