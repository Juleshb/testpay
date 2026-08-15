import { prisma } from '../db.js';
import { getNetwork } from '../config/networks.js';

function parseDay(dateStr) {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const now = new Date();
  const y = match ? Number(match[1]) : now.getUTCFullYear();
  const m = match ? Number(match[2]) - 1 : now.getUTCMonth();
  const d = match ? Number(match[3]) : now.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  const iso = start.toISOString().slice(0, 10);
  return { start, end, iso };
}

function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return num(value).toFixed(2);
}

function userHandle(user) {
  if (!user) return '—';
  return user.username || user.email || user.phone || user.name || user.id?.slice(0, 8) || '—';
}

function formatUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    label: userHandle(user),
    email: user.email || null,
    username: user.username || null,
  };
}

function eventAt(row, fields) {
  for (const field of fields) {
    if (row[field]) return new Date(row[field]);
  }
  return null;
}

function inRange(date, start, end) {
  return date && date >= start && date < end;
}

function addInvest(map, userId, user, amount, kind) {
  if (!userId || !(amount > 0)) return;
  const row = map.get(userId) || {
    userId,
    user: formatUser(user),
    packagesUsd: 0,
    miningUsd: 0,
    totalUsd: 0,
  };
  if (kind === 'package') row.packagesUsd += amount;
  if (kind === 'mining') row.miningUsd += amount;
  row.totalUsd = row.packagesUsd + row.miningUsd;
  map.set(userId, row);
}

const USER_SELECT = { id: true, email: true, phone: true, name: true, username: true };

export async function getAdminDailyReport({ date } = {}) {
  const { start, end, iso } = parseDay(date);
  const trendStart = new Date(start.getTime() - 6 * 86400000);

  const paidWhere = (from, to) => ({
    status: { in: ['CONFIRMED', 'SWEPT'] },
    OR: [
      { paidAt: { gte: from, lt: to } },
      { paidAt: null, createdAt: { gte: from, lt: to } },
    ],
  });

  const completedWithdrawWhere = (from, to) => ({
    status: 'COMPLETED',
    OR: [
      { processedAt: { gte: from, lt: to } },
      { processedAt: null, createdAt: { gte: from, lt: to } },
    ],
  });

  const [
    newUsers,
    payments,
    packageInvestments,
    miningPositions,
    withdrawals,
    transfers,
    referralCommissions,
    loans,
    trendPayments,
    trendPackages,
    trendMining,
    trendWithdrawals,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: start, lt: end }, role: 'USER' },
      orderBy: { createdAt: 'desc' },
      select: USER_SELECT,
    }),
    prisma.payment.findMany({
      where: paidWhere(start, end),
      include: { user: { select: USER_SELECT } },
    }),
    prisma.packageInvestment.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: {
        user: { select: USER_SELECT },
        package: { select: { name: true } },
      },
    }),
    prisma.miningPosition.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: {
        user: { select: USER_SELECT },
        option: { select: { name: true, isFree: true } },
      },
    }),
    prisma.withdrawal.findMany({
      where: {
        OR: [
          { processedAt: { gte: start, lt: end } },
          { processedAt: null, createdAt: { gte: start, lt: end } },
        ],
      },
      include: { user: { select: USER_SELECT } },
    }),
    prisma.userTransfer.findMany({
      where: { createdAt: { gte: start, lt: end } },
    }),
    prisma.referralCommission.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { commissionUsd: true },
    }),
    prisma.loan.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { principalUsd: true, status: true },
    }),
    prisma.payment.findMany({
      where: paidWhere(trendStart, end),
      select: { usdAmount: true, paidAt: true, createdAt: true },
    }),
    prisma.packageInvestment.findMany({
      where: { createdAt: { gte: trendStart, lt: end } },
      select: { amount: true, createdAt: true },
    }),
    prisma.miningPosition.findMany({
      where: { createdAt: { gte: trendStart, lt: end } },
      select: { amount: true, createdAt: true, option: { select: { isFree: true } } },
    }),
    prisma.withdrawal.findMany({
      where: completedWithdrawWhere(trendStart, end),
      select: { amountUsd: true, processedAt: true, createdAt: true },
    }),
  ]);

  const paidMining = miningPositions.filter((p) => !p.option?.isFree);
  const depositUsd = payments.reduce((sum, p) => sum + num(p.usdAmount), 0);
  const packagesUsd = packageInvestments.reduce((sum, row) => sum + num(row.amount), 0);
  const miningUsd = paidMining.reduce((sum, row) => sum + num(row.amount), 0);

  const completedWithdrawals = withdrawals.filter((w) => w.status === 'COMPLETED');
  const withdrawUsd = completedWithdrawals.reduce((sum, w) => sum + num(w.amountUsd), 0);
  const withdrawFeesUsd = completedWithdrawals.reduce((sum, w) => sum + num(w.feeUsd), 0);

  const investMap = new Map();
  for (const row of packageInvestments) {
    addInvest(investMap, row.userId, row.user, num(row.amount), 'package');
  }
  for (const row of paidMining) {
    addInvest(investMap, row.userId, row.user, num(row.amount), 'mining');
  }

  const topInvestors = [...investMap.values()]
    .sort((a, b) => b.totalUsd - a.totalUsd)
    .slice(0, 8)
    .map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      user: row.user,
      packagesUsd: money(row.packagesUsd),
      miningUsd: money(row.miningUsd),
      totalUsd: money(row.totalUsd),
    }));

  const depositMap = new Map();
  for (const p of payments) {
    if (!p.userId) continue;
    const usd = num(p.usdAmount);
    if (!(usd > 0)) continue;
    const row = depositMap.get(p.userId) || {
      userId: p.userId,
      user: formatUser(p.user),
      totalUsd: 0,
      count: 0,
    };
    row.totalUsd += usd;
    row.count += 1;
    depositMap.set(p.userId, row);
  }

  const topDepositors = [...depositMap.values()]
    .sort((a, b) => b.totalUsd - a.totalUsd)
    .slice(0, 8)
    .map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      user: row.user,
      totalUsd: money(row.totalUsd),
      count: row.count,
    }));

  const byToken = {};
  const byNetwork = {};
  for (const p of payments) {
    byToken[p.tokenSymbol] = (byToken[p.tokenSymbol] || 0) + num(p.usdAmount);
    const net = getNetwork(p.chainId)?.name || `Chain ${p.chainId}`;
    byNetwork[net] = (byNetwork[net] || 0) + num(p.usdAmount);
  }

  const trend = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dayStart = new Date(start.getTime() - i * 86400000);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const depositsUsd = trendPayments
      .filter((p) => inRange(eventAt(p, ['paidAt', 'createdAt']), dayStart, dayEnd))
      .reduce((sum, p) => sum + num(p.usdAmount), 0);
    const investedUsd =
      trendPackages
        .filter((r) => inRange(eventAt(r, ['createdAt']), dayStart, dayEnd))
        .reduce((sum, r) => sum + num(r.amount), 0) +
      trendMining
        .filter((r) => !r.option?.isFree && inRange(eventAt(r, ['createdAt']), dayStart, dayEnd))
        .reduce((sum, r) => sum + num(r.amount), 0);
    const withdrawnUsd = trendWithdrawals
      .filter((r) => inRange(eventAt(r, ['processedAt', 'createdAt']), dayStart, dayEnd))
      .reduce((sum, r) => sum + num(r.amountUsd), 0);
    trend.push({
      date: dayStart.toISOString().slice(0, 10),
      depositsUsd: money(depositsUsd),
      investedUsd: money(investedUsd),
      withdrawnUsd: money(withdrawnUsd),
    });
  }

  return {
    date: iso,
    timezone: 'UTC',
    snapshot: {
      newUsers: newUsers.length,
      deposits: payments.length,
      depositsUsd: money(depositUsd),
      packageInvestments: packageInvestments.length,
      packagesUsd: money(packagesUsd),
      miningPositions: paidMining.length,
      miningUsd: money(miningUsd),
      investedUsd: money(packagesUsd + miningUsd),
      withdrawals: completedWithdrawals.length,
      withdrawnUsd: money(withdrawUsd),
      withdrawFeesUsd: money(withdrawFeesUsd),
      failedWithdrawals: withdrawals.filter((w) => w.status === 'FAILED').length,
      transfers: transfers.length,
      transferUsd: money(transfers.reduce((sum, row) => sum + num(row.amountUsd), 0)),
      referralUsd: money(referralCommissions.reduce((sum, row) => sum + num(row.commissionUsd), 0)),
      loans: loans.length,
      loanUsd: money(loans.reduce((sum, row) => sum + num(row.principalUsd), 0)),
    },
    best: {
      investor: topInvestors[0] || null,
      depositor: topDepositors[0] || null,
    },
    topInvestors,
    topDepositors,
    breakdown: {
      byToken: Object.entries(byToken)
        .map(([symbol, usd]) => ({ symbol, usd: money(usd) }))
        .sort((a, b) => num(b.usd) - num(a.usd)),
      byNetwork: Object.entries(byNetwork)
        .map(([name, usd]) => ({ name, usd: money(usd) }))
        .sort((a, b) => num(b.usd) - num(a.usd)),
    },
    newUsers: newUsers.slice(0, 10).map(formatUser),
    recentInvestments: [...packageInvestments, ...paidMining]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map((row) => ({
        id: row.id,
        kind: row.planId ? 'package' : 'mining',
        amountUsd: money(row.amount),
        name: row.package?.name || row.option?.name || '—',
        user: formatUser(row.user),
        createdAt: row.createdAt,
      })),
    trend,
  };
}
