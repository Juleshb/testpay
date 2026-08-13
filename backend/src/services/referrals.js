import crypto from 'crypto';
import { prisma } from '../db.js';
import { resolveAvatarUrl } from './avatar.js';

const DEFAULT_COMMISSION_PERCENT = '10';

export function normalizeInviteCode(input) {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned.length >= 4 ? cleaned : null;
}

export async function generateUniqueInviteCode(tx = prisma) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = crypto.randomBytes(4).toString('hex').toUpperCase();
    const exists = await tx.user.findUnique({ where: { inviteCode: candidate } });
    if (!exists) return candidate;
  }
  return `INV${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

export async function assignInviteCodeIfMissing(userId, tx = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { inviteCode: true },
  });
  if (user?.inviteCode) return user.inviteCode;

  const inviteCode = await generateUniqueInviteCode(tx);
  await tx.user.update({ where: { id: userId }, data: { inviteCode } });
  return inviteCode;
}

export async function bootstrapInviteCodes() {
  const users = await prisma.user.findMany({
    where: { inviteCode: null },
    select: { id: true },
  });

  for (const user of users) {
    await assignInviteCodeIfMissing(user.id);
  }

  if (users.length > 0) {
    console.log(`Invite codes assigned to ${users.length} account(s)`);
  }
}

export async function getReferralSettings(tx = prisma) {
  let settings = await tx.referralSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await tx.referralSettings.create({
      data: { id: 1, commissionPercent: DEFAULT_COMMISSION_PERCENT },
    });
  }
  return settings;
}

export async function updateReferralSettings(commissionPercent) {
  const num = parseFloat(commissionPercent);
  if (isNaN(num) || num < 0 || num > 100) {
    throw new Error('Commission percent must be between 0 and 100');
  }

  const value = num.toFixed(2).replace(/\.?0+$/, '') || '0';
  return prisma.referralSettings.upsert({
    where: { id: 1 },
    create: { id: 1, commissionPercent: value },
    update: { commissionPercent: value },
  });
}

export async function resolveInviterByCode(code, tx = prisma) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return null;

  return tx.user.findFirst({
    where: { inviteCode: normalized },
    select: { id: true, inviteCode: true, username: true, name: true },
  });
}

export async function processFirstPackageReferralCommission({
  inviteeId,
  investmentId,
  packageAmountUsd,
  tx,
}) {
  const invitee = await tx.user.findUnique({
    where: { id: inviteeId },
    select: { id: true, referredById: true },
  });

  if (!invitee?.referredById || invitee.referredById === inviteeId) {
    return null;
  }

  const priorInvestments = await tx.packageInvestment.count({
    where: { userId: inviteeId, id: { not: investmentId } },
  });
  if (priorInvestments > 0) return null;

  const existing = await tx.referralCommission.findUnique({
    where: { inviteeId },
  });
  if (existing) return null;

  const settings = await getReferralSettings(tx);
  const percent = parseFloat(settings.commissionPercent) || 0;
  if (percent <= 0) return null;

  const amountNum = parseFloat(packageAmountUsd);
  if (isNaN(amountNum) || amountNum <= 0) return null;

  const commissionUsd = ((amountNum * percent) / 100).toFixed(2);
  if (parseFloat(commissionUsd) <= 0) return null;

  const commission = await tx.referralCommission.create({
    data: {
      inviterId: invitee.referredById,
      inviteeId,
      investmentId,
      packageAmountUsd: amountNum.toFixed(2),
      commissionPercent: String(percent),
      commissionUsd,
    },
  });

  await tx.balanceEntry.create({
    data: {
      userId: invitee.referredById,
      type: 'CREDIT',
      amountUsd: commissionUsd,
      sourceType: 'REFERRAL',
      sourceId: commission.id,
    },
  });

  console.log(
    `Referral commission $${commissionUsd} (${percent}%) credited to ${invitee.referredById} for invitee ${inviteeId}`
  );

  return commission;
}

export async function getReferralSummary(userId) {
  const [user, settings, commissions, referralCount, invitedUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        inviteCode: true,
        referredBy: {
          select: { id: true, username: true, name: true, inviteCode: true, avatarUrl: true },
        },
      },
    }),
    getReferralSettings(),
    prisma.referralCommission.findMany({
      where: { inviterId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        invitee: { select: { id: true, username: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.user.findMany({
      where: { referredById: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        referralAsInvitee: {
          select: {
            commissionUsd: true,
            packageAmountUsd: true,
            commissionPercent: true,
            createdAt: true,
          },
        },
        _count: {
          select: { packageInvestments: true },
        },
      },
    }),
  ]);

  const inviteCode = user?.inviteCode || (await assignInviteCodeIfMissing(userId));

  let totalEarnedUsd = 0;
  for (const row of commissions) {
    totalEarnedUsd += parseFloat(row.commissionUsd) || 0;
  }

  return {
    inviteCode,
    commissionPercent: settings.commissionPercent,
    referredBy: user?.referredBy
      ? {
          id: user.referredBy.id,
          username: user.referredBy.username,
          name: user.referredBy.name,
          inviteCode: user.referredBy.inviteCode,
          avatarUrl: resolveAvatarUrl(user.referredBy),
        }
      : null,
    stats: {
      referralCount,
      paidReferrals: commissions.length,
      totalEarnedUsd: totalEarnedUsd.toFixed(2),
    },
    commissions: commissions.map((c) => ({
      id: c.id,
      commissionUsd: c.commissionUsd,
      commissionPercent: c.commissionPercent,
      packageAmountUsd: c.packageAmountUsd,
      createdAt: c.createdAt,
      invitee: {
        username: c.invitee.username,
        name: c.invitee.name,
        avatarUrl: resolveAvatarUrl(c.invitee),
      },
    })),
    invitedUsers: invitedUsers.map((invitee) => {
      const commission = invitee.referralAsInvitee;
      const hasInvested = invitee._count.packageInvestments > 0;
      let status = 'pending';
      if (commission) status = 'earned';
      else if (hasInvested) status = 'invested';

      return {
        id: invitee.id,
        username: invitee.username,
        name: invitee.name,
        avatarUrl: resolveAvatarUrl(invitee),
        joinedAt: invitee.createdAt,
        investmentCount: invitee._count.packageInvestments,
        status,
        commissionUsd: commission?.commissionUsd ?? null,
        packageAmountUsd: commission?.packageAmountUsd ?? null,
        commissionPercent: commission?.commissionPercent ?? null,
        earnedAt: commission?.createdAt ?? null,
      };
    }),
  };
}
