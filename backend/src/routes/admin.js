import { Router } from 'express';
import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { sweepConfirmedPayments } from '../services/sweep.js';
import { getNetwork, getNetworksList } from '../config/networks.js';
import { getDepositAddress, getPayoutAddress, getPayoutSourceLabel, getTreasuryBalances } from '../services/wallet.js';
import { getTreasuryActivity } from '../services/treasuryActivity.js';
import { attachTreasuryStream, notifyTreasuryChanged } from '../services/treasuryRealtime.js';
import { APP_VERSION } from './public.js';
import { formatPackage, validatePackageInput } from '../services/bootstrapPackages.js';
import {
  formatMiningOption,
  validateMiningOptionInput,
} from '../services/bootstrapMining.js';
import { accruePackageDailyIncome, applyActivePackageTerms } from '../services/packageAccrual.js';
import { accrueMiningDailyIncome, applyActiveMiningTerms } from '../services/miningAccrual.js';
import {
  getReferralSettings,
  updateReferralSettings,
} from '../services/referrals.js';
import {
  getWithdrawSettings,
  updateWithdrawSettings,
  getWithdrawFeeStats,
} from '../services/withdrawSettings.js';
import { formatWithdrawal, listWithdrawalsForAdmin, cancelWithdrawal, retryWithdrawal, processWithdrawalById, processPendingWithdrawals } from '../services/withdrawals.js';
import {
  listAllShowcaseTeam,
  createShowcaseMember,
  updateShowcaseMember,
  deleteShowcaseMember,
} from '../services/showcaseTeam.js';
import {
  listAllTestimonials,
  createShowcaseTestimonial,
  updateShowcaseTestimonial,
  deleteShowcaseTestimonial,
} from '../services/showcaseTestimonials.js';
import { getAdminUserAccount } from '../services/adminUserAccount.js';
import { getAdminDailyReport } from '../services/adminReport.js';

const router = Router();
const startedAt = new Date();

router.use(authMiddleware(true));
router.use(adminMiddleware());

router.get('/reports', async (req, res) => {
  try {
    const report = await getAdminDailyReport({ date: req.query.date });
    res.json(report);
  } catch (err) {
    console.error('Admin report error:', err);
    res.status(500).json({ error: 'Failed to load report' });
  }
});

router.get('/dashboard', async (_req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      userCount,
      adminCount,
      paymentCount,
      pending,
      confirmed,
      swept,
      expired,
      allPayments,
      walletIndex,
      recentPayments,
      recentUsers,
      packageCount,
      activePackages,
      packageInvestments,
      activePackageInvestments,
      miningOptions,
      activeMiningOptions,
      miningPositions,
      activeMiningPositions,
      withdrawalCount,
      pendingWithdrawals,
      completedWithdrawals,
      failedWithdrawals,
      withdrawals24h,
      transferCount,
      transfers24h,
      loanCount,
      activeLoans,
      referralSignups,
      referralCommissions,
      communityChannels,
      communityPosts,
      withdrawSettings,
      withdrawFeeStats,
      referralSettings,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'CONFIRMED' } }),
      prisma.payment.count({ where: { status: 'SWEPT' } }),
      prisma.payment.count({ where: { status: 'EXPIRED' } }),
      prisma.payment.findMany({
        select: {
          chainId: true,
          tokenSymbol: true,
          status: true,
          amount: true,
          paidAmount: true,
          usdAmount: true,
          createdAt: true,
        },
      }),
      prisma.walletIndex.findUnique({ where: { id: 1 } }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { email: true, phone: true, name: true, username: true } } },
      }),
      prisma.user.findMany({
        where: { role: 'USER' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          username: true,
          createdAt: true,
          _count: { select: { payments: true } },
        },
      }),
      prisma.package.count(),
      prisma.package.count({ where: { active: true } }),
      prisma.packageInvestment.count(),
      prisma.packageInvestment.count({ where: { status: 'ACTIVE' } }),
      prisma.miningOption.count(),
      prisma.miningOption.count({ where: { active: true } }),
      prisma.miningPosition.count(),
      prisma.miningPosition.count({ where: { status: 'ACTIVE' } }),
      prisma.withdrawal.count(),
      prisma.withdrawal.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
      prisma.withdrawal.count({ where: { status: 'COMPLETED' } }),
      prisma.withdrawal.count({ where: { status: 'FAILED' } }),
      prisma.withdrawal.findMany({
        where: { createdAt: { gte: since24h } },
        select: { amountUsd: true, feeUsd: true, status: true },
      }),
      prisma.userTransfer.count(),
      prisma.userTransfer.count({ where: { createdAt: { gte: since24h } } }),
      prisma.loan.count(),
      prisma.loan.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { referredById: { not: null } } }),
      prisma.referralCommission.findMany({ select: { commissionUsd: true } }),
      prisma.communityChannel.count(),
      prisma.communityPost.count(),
      getWithdrawSettings(),
      getWithdrawFeeStats(),
      getReferralSettings(),
    ]);

    const byNetwork = {};
    const byToken = {};
    const byStatus = { PENDING: 0, CONFIRMED: 0, SWEPT: 0, EXPIRED: 0 };
    let totalVolume = 0;
    let confirmedVolume = 0;
    let confirmedUsd = 0;

    for (const p of allPayments) {
      const netName = getNetwork(p.chainId)?.name || `Chain ${p.chainId}`;
      byNetwork[netName] = (byNetwork[netName] || 0) + 1;
      byToken[p.tokenSymbol] = (byToken[p.tokenSymbol] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;

      const amt = parseFloat(p.paidAmount || p.amount || 0);
      if (!isNaN(amt)) {
        totalVolume += amt;
        if (p.status === 'CONFIRMED' || p.status === 'SWEPT') {
          confirmedVolume += parseFloat(p.paidAmount || p.amount || 0);
        }
      }
      if ((p.status === 'CONFIRMED' || p.status === 'SWEPT') && p.usdAmount) {
        confirmedUsd += parseFloat(p.usdAmount) || 0;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentsToday = allPayments.filter((p) => new Date(p.createdAt) >= today).length;

    const withdrawals24hCount = withdrawals24h.length;
    const withdrawals24hVolume = withdrawals24h
      .reduce((sum, w) => sum + (parseFloat(w.amountUsd) || 0), 0)
      .toFixed(2);
    const withdrawals24hFees = withdrawals24h
      .reduce((sum, w) => sum + (parseFloat(w.feeUsd) || 0), 0)
      .toFixed(2);

    const referralPaidUsd = referralCommissions
      .reduce((sum, row) => sum + (parseFloat(row.commissionUsd) || 0), 0)
      .toFixed(2);

    const depositedUsd = confirmedUsd;
    const feesIncomeUsd = parseFloat(withdrawFeeStats.totalFeesUsd) || 0;
    const systemAvailableUsd = depositedUsd + feesIncomeUsd;

    res.json({
      overview: {
        users: userCount,
        admins: adminCount,
        payments: paymentCount,
        paymentsToday,
        pending,
        confirmed,
        swept,
        expired,
        successRate:
          paymentCount > 0 ? Math.round(((confirmed + swept) / paymentCount) * 100) : 0,
      },
      modules: {
        packages: {
          options: packageCount,
          activeOptions: activePackages,
          investments: packageInvestments,
          activeInvestments: activePackageInvestments,
        },
        mining: {
          options: miningOptions,
          activeOptions: activeMiningOptions,
          positions: miningPositions,
          activePositions: activeMiningPositions,
        },
        withdrawals: {
          total: withdrawalCount,
          pending: pendingWithdrawals,
          completed: completedWithdrawals,
          failed: failedWithdrawals,
          last24hCount: withdrawals24hCount,
          last24hVolumeUsd: withdrawals24hVolume,
          last24hFeesUsd: withdrawals24hFees,
          totalFeesUsd: withdrawFeeStats.totalFeesUsd,
          totalVolumeUsd: withdrawFeeStats.totalVolumeUsd,
        },
        transfers: {
          total: transferCount,
          last24h: transfers24h,
        },
        loans: {
          total: loanCount,
          active: activeLoans,
        },
        referrals: {
          signups: referralSignups,
          commissions: referralCommissions.length,
          paidUsd: referralPaidUsd,
          commissionPercent: referralSettings.commissionPercent,
        },
        community: {
          channels: communityChannels,
          posts: communityPosts,
        },
      },
      settings: {
        withdraw: withdrawSettings,
        referral: {
          commissionPercent: referralSettings.commissionPercent,
        },
      },
      volume: {
        totalPaymentRequests: paymentCount,
        approximateVolume: totalVolume.toFixed(6),
        confirmedVolume: confirmedVolume.toFixed(6),
        confirmedUsd: confirmedUsd.toFixed(2),
      },
      systemBalance: {
        depositedUsd: depositedUsd.toFixed(2),
        feesIncomeUsd: feesIncomeUsd.toFixed(2),
        availableUsd: systemAvailableUsd.toFixed(2),
      },
      breakdown: {
        byNetwork: Object.entries(byNetwork)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        byToken: Object.entries(byToken)
          .map(([symbol, count]) => ({ symbol, count }))
          .sort((a, b) => b.count - a.count),
        byStatus: Object.entries(byStatus).map(([status, count]) => ({
          status,
          count,
        })),
      },
      system: {
        appVersion: APP_VERSION,
        apiHealthy: true,
        treasuryAddress: config.treasuryAddress,
        gasFunderAddress: getDepositAddress(0),
        payoutWalletAddress: getPayoutAddress(),
        payoutWalletIndex: config.payoutUseTreasury ? 0 : config.payoutWalletIndex,
        payoutUseTreasury: config.payoutUseTreasury,
        payoutSourceLabel: getPayoutSourceLabel(),
        defaultChainId: config.defaultChainId,
        defaultNetwork: getNetwork(config.defaultChainId)?.name || 'Unknown',
        pollIntervalMs: config.pollIntervalMs,
        sweepIntervalMs: config.sweepIntervalMs,
        withdrawPollIntervalMs: config.withdrawPollIntervalMs,
        minWithdrawUsdEnv: config.minWithdrawUsd,
        maxWithdrawUsdEnv: config.maxWithdrawUsd,
        frontendUrl: config.frontendUrl,
        serverStartedAt: startedAt.toISOString(),
        uptimeSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
        walletsGenerated: walletIndex?.index || 0,
        supportedNetworks: getNetworksList().map((n) => ({
          chainId: n.chainId,
          name: n.name,
          nativeSymbol: n.nativeSymbol,
          tokenCount: n.tokens.length,
          explorer: n.explorer,
          tokens: n.tokens.map((t) => t.symbol),
        })),
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        tokenSymbol: p.tokenSymbol,
        chainId: p.chainId,
        networkName: getNetwork(p.chainId)?.name || `Chain ${p.chainId}`,
        status: p.status,
        depositAddress: p.depositAddress,
        userEmail: p.user?.email || p.user?.phone || p.user?.username || '—',
        userName: p.user?.name || '—',
        txHash: p.txHash,
        sweepTxHash: p.sweepTxHash,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        sweptAt: p.sweptAt,
      })),
      users: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        name: u.name,
        username: u.username,
        paymentCount: u._count.payments,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

router.get('/payments', async (_req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { email: true, phone: true, name: true } } },
    });

    res.json(
      payments.map((p) => ({
        ...p,
        networkName: getNetwork(p.chainId)?.name || `Chain ${p.chainId}`,
        userEmail: p.user?.email || p.user?.phone || '—',
        userName: p.user?.name || '—',
        user: undefined,
      }))
    );
  } catch (err) {
    console.error('Admin payments error:', err);
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        blocked: true,
        createdAt: true,
        _count: { select: { payments: true, balanceEntries: true } },
      },
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        phone: u.phone,
        name: u.name,
        role: u.role,
        blocked: Boolean(u.blocked),
        createdAt: u.createdAt,
        paymentCount: u._count.payments,
        transactionCount: u._count.balanceEntries,
      }))
    );
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const account = await getAdminUserAccount(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(account);
  } catch (err) {
    console.error('Admin user account error:', err);
    res.status(500).json({ error: 'Failed to load user account' });
  }
});

router.patch('/users/:id/block', async (req, res) => {
  try {
    const targetId = String(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'You cannot block your own account' });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, blocked: true },
    });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'ADMIN') {
      return res.status(400).json({ error: 'Admin accounts cannot be blocked' });
    }

    const blocked = Boolean(req.body.blocked);
    const reason = String(req.body.reason || '').trim().slice(0, 500) || null;

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: blocked
        ? { blocked: true, blockedAt: new Date(), blockedReason: reason }
        : { blocked: false, blockedAt: null, blockedReason: null },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        blocked: true,
        blockedAt: true,
        blockedReason: true,
      },
    });

    res.json({ user: updated });
  } catch (err) {
    console.error('Admin block user error:', err);
    res.status(500).json({ error: 'Failed to update user block status' });
  }
});

router.get('/packages', async (_req, res) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { investments: true } } },
    });
    res.json(
      packages.map((p) => ({
        ...formatPackage(p),
        investmentCount: p._count.investments,
      }))
    );
  } catch (err) {
    console.error('Admin packages list error:', err);
    res.status(500).json({ error: 'Failed to list packages' });
  }
});

router.post('/packages', async (req, res) => {
  try {
    const { errors, data } = validatePackageInput(req.body);
    if (errors.length) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const existing = await prisma.package.findFirst({
      where: {
        OR: [{ slug: data.slug }, { name: data.name }],
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'A package with this name or slug already exists' });
    }

    const pkg = await prisma.package.create({
      data: {
        ...data,
        active: data.active ?? true,
      },
    });
    res.status(201).json(formatPackage(pkg));
  } catch (err) {
    console.error('Admin create package error:', err);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

router.patch('/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const { errors, data } = validatePackageInput(req.body, true);
    if (errors.length) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await prisma.package.findFirst({ where: { slug: data.slug, NOT: { id } } });
      if (slugTaken) return res.status(409).json({ error: 'Slug already in use' });
    }
    if (data.name && data.name !== existing.name) {
      const nameTaken = await prisma.package.findFirst({ where: { name: data.name, NOT: { id } } });
      if (nameTaken) return res.status(409).json({ error: 'Name already in use' });
    }

    const pkg = await prisma.package.update({
      where: { id },
      data,
    });

    const durationChanged = data.durationDays != null;
    const rateChanged =
      data.dailyRate != null && String(data.dailyRate) !== String(existing.dailyRate);

    const activeTerms = durationChanged
      ? await applyActivePackageTerms(id, { durationDays: data.durationDays })
      : { updated: 0, completed: 0 };

    if (rateChanged || durationChanged) {
      accruePackageDailyIncome().catch((err) =>
        console.error('Package accrual after admin update:', err.message)
      );
    }

    res.json({ ...formatPackage(pkg), activeTerms });
  } catch (err) {
    console.error('Admin update package error:', err);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

router.get('/mining', async (_req, res) => {
  try {
    const options = await prisma.miningOption.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { positions: true } } },
    });
    res.json(
      options.map((o) => ({
        ...formatMiningOption(o),
        positionCount: o._count.positions,
      }))
    );
  } catch (err) {
    console.error('Admin mining list error:', err);
    res.status(500).json({ error: 'Failed to list mining options' });
  }
});

router.post('/mining', async (req, res) => {
  try {
    const { errors, data } = validateMiningOptionInput(req.body);
    if (errors.length) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const existing = await prisma.miningOption.findFirst({
      where: {
        OR: [{ slug: data.slug }, { name: data.name }],
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'A mining option with this name or slug already exists' });
    }

    const option = await prisma.miningOption.create({
      data: {
        ...data,
        active: data.active ?? true,
        coin: data.coin || 'BTC',
      },
    });
    res.status(201).json(formatMiningOption(option));
  } catch (err) {
    console.error('Admin create mining option error:', err);
    res.status(500).json({ error: 'Failed to create mining option' });
  }
});

router.patch('/mining/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.miningOption.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Mining option not found' });
    }

    const { errors, data } = validateMiningOptionInput(req.body, true);
    if (errors.length) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await prisma.miningOption.findFirst({ where: { slug: data.slug, NOT: { id } } });
      if (slugTaken) return res.status(409).json({ error: 'Slug already in use' });
    }
    if (data.name && data.name !== existing.name) {
      const nameTaken = await prisma.miningOption.findFirst({ where: { name: data.name, NOT: { id } } });
      if (nameTaken) return res.status(409).json({ error: 'Name already in use' });
    }

    const option = await prisma.miningOption.update({
      where: { id },
      data,
    });

    const durationChanged = data.durationDays != null;
    const rateChanged =
      data.dailyRate != null && String(data.dailyRate) !== String(existing.dailyRate);

    const activeTerms = durationChanged
      ? await applyActiveMiningTerms(id, { durationDays: data.durationDays })
      : { updated: 0, completed: 0 };

    if (rateChanged || durationChanged) {
      accrueMiningDailyIncome().catch((err) =>
        console.error('Mining accrual after admin update:', err.message)
      );
    }

    res.json({ ...formatMiningOption(option), activeTerms });
  } catch (err) {
    console.error('Admin update mining option error:', err);
    res.status(500).json({ error: 'Failed to update mining option' });
  }
});

router.delete('/mining/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.miningOption.findUnique({
      where: { id },
      include: { _count: { select: { positions: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Mining option not found' });
    }
    if (existing._count.positions > 0) {
      await prisma.miningOption.update({
        where: { id },
        data: { active: false },
      });
      return res.json({ id, deactivated: true });
    }
    await prisma.miningOption.delete({ where: { id } });
    res.json({ id, deleted: true });
  } catch (err) {
    console.error('Admin delete mining option error:', err);
    res.status(500).json({ error: 'Failed to delete mining option' });
  }
});

router.get('/treasury-balances', async (req, res) => {
  try {
    const force = String(req.query.force || '') === '1' || String(req.query.force || '') === 'true';
    const data = await getTreasuryBalances({ force });
    res.json(data);
  } catch (err) {
    console.error('Admin treasury balances error:', err);
    res.status(500).json({ error: err.message || 'Failed to load treasury balances' });
  }
});

router.get('/treasury-activity', async (req, res) => {
  try {
    const data = await getTreasuryActivity({ limit: req.query.limit || 50 });
    res.json(data);
  } catch (err) {
    console.error('Admin treasury activity error:', err);
    res.status(500).json({ error: err.message || 'Failed to load treasury activity' });
  }
});

router.get('/treasury/stream', (req, res) => {
  attachTreasuryStream(req, res);
});

router.post('/sweep', async (_req, res) => {
  try {
    const results = await Promise.race([
      sweepConfirmedPayments(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sweep timed out')), 25000)
      ),
    ]);
    notifyTreasuryChanged();
    res.json({ swept: results });
  } catch (err) {
    res.status(504).json({ error: err.message || 'Sweep failed' });
  }
});

router.get('/referrals/settings', async (_req, res) => {
  try {
    const settings = await getReferralSettings();
    const [totalCommissions, commissionRows, referralSignups] = await Promise.all([
      prisma.referralCommission.count(),
      prisma.referralCommission.findMany({ select: { commissionUsd: true } }),
      prisma.user.count({ where: { referredById: { not: null } } }),
    ]);

    const totalPaidUsd = commissionRows
      .reduce((sum, row) => sum + (parseFloat(row.commissionUsd) || 0), 0)
      .toFixed(2);

    res.json({
      commissionPercent: settings.commissionPercent,
      stats: {
        totalCommissions,
        totalPaidUsd,
        referralSignups,
      },
    });
  } catch (err) {
    console.error('Admin referral settings get error:', err);
    res.status(500).json({ error: 'Failed to load referral settings' });
  }
});

router.get('/withdrawals/settings', async (_req, res) => {
  try {
    const [settings, feeStats, list] = await Promise.all([
      getWithdrawSettings(),
      getWithdrawFeeStats(),
      listWithdrawalsForAdmin({ limit: 100 }),
    ]);

    res.json({
      settings,
      stats: {
        ...feeStats,
        statusCounts: list.statusCounts,
        total: list.total,
      },
      recent: list.withdrawals,
    });
  } catch (err) {
    console.error('Admin withdraw settings get error:', err);
    res.status(500).json({ error: 'Failed to load withdraw settings' });
  }
});

router.get('/withdrawals', async (req, res) => {
  try {
    const data = await listWithdrawalsForAdmin({
      status: req.query.status,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (err) {
    console.error('Admin withdrawals list error:', err);
    res.status(500).json({ error: 'Failed to list withdrawals' });
  }
});

router.post('/withdrawals/:id/cancel', async (req, res) => {
  try {
    const withdrawal = await cancelWithdrawal(req.params.id, { reason: req.body?.reason });
    res.json({ withdrawal });
  } catch (err) {
    console.error('Admin cancel withdrawal error:', err);
    res.status(err.status || 400).json({ error: err.message || 'Failed to cancel withdrawal' });
  }
});

router.post('/withdrawals/:id/retry', async (req, res) => {
  try {
    const withdrawal = await retryWithdrawal(req.params.id);
    res.json({ withdrawal });
  } catch (err) {
    console.error('Admin retry withdrawal error:', err);
    res.status(err.status || 400).json({ error: err.message || 'Failed to retry withdrawal' });
  }
});

router.post('/withdrawals/:id/process', async (req, res) => {
  try {
    const result = await processWithdrawalById(req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Processing failed', withdrawal: result.withdrawal });
    }
    res.json(result);
  } catch (err) {
    console.error('Admin process withdrawal error:', err);
    res.status(err.status || 400).json({ error: err.message || 'Failed to process withdrawal' });
  }
});

router.post('/withdrawals/process-queue', async (_req, res) => {
  try {
    const results = await processPendingWithdrawals();
    res.json({ results });
  } catch (err) {
    console.error('Admin process queue error:', err);
    res.status(500).json({ error: err.message || 'Failed to process queue' });
  }
});

router.patch('/withdrawals/settings', async (req, res) => {
  try {
    const settings = await updateWithdrawSettings(req.body || {});
    res.json({ settings });
  } catch (err) {
    console.error('Admin withdraw settings update error:', err);
    res.status(err.status || 400).json({ error: err.message || 'Failed to update withdraw settings' });
  }
});

router.patch('/referrals/settings', async (req, res) => {
  try {
    const { commissionPercent } = req.body;
    if (commissionPercent === undefined || commissionPercent === null) {
      return res.status(400).json({ error: 'commissionPercent is required' });
    }
    const settings = await updateReferralSettings(commissionPercent);
    res.json({ commissionPercent: settings.commissionPercent });
  } catch (err) {
    console.error('Admin referral settings update error:', err);
    res.status(400).json({ error: err.message || 'Failed to update referral settings' });
  }
});

router.get('/referrals/commissions', async (_req, res) => {
  try {
    const rows = await prisma.referralCommission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        inviter: { select: { username: true, name: true, email: true } },
        invitee: { select: { username: true, name: true, email: true } },
      },
    });
    res.json(
      rows.map((r) => ({
        id: r.id,
        commissionUsd: r.commissionUsd,
        commissionPercent: r.commissionPercent,
        packageAmountUsd: r.packageAmountUsd,
        createdAt: r.createdAt,
        inviter: { username: r.inviter.username, name: r.inviter.name },
        invitee: { username: r.invitee.username, name: r.invitee.name },
      }))
    );
  } catch (err) {
    console.error('Admin referral commissions error:', err);
    res.status(500).json({ error: 'Failed to load referral commissions' });
  }
});

router.get('/showcase-team', async (_req, res) => {
  try {
    const members = await listAllShowcaseTeam();
    res.json(members);
  } catch (err) {
    console.error('Admin showcase team list error:', err);
    res.status(500).json({ error: 'Failed to load showcase team' });
  }
});

router.post('/showcase-team', async (req, res) => {
  try {
    const member = await createShowcaseMember(req.body);
    res.status(201).json(member);
  } catch (err) {
    console.error('Admin showcase team create error:', err);
    res.status(400).json({ error: err.message || 'Failed to create team member' });
  }
});

router.patch('/showcase-team/:id', async (req, res) => {
  try {
    const member = await updateShowcaseMember(req.params.id, req.body);
    res.json(member);
  } catch (err) {
    console.error('Admin showcase team update error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Team member not found' });
    }
    res.status(400).json({ error: err.message || 'Failed to update team member' });
  }
});

router.delete('/showcase-team/:id', async (req, res) => {
  try {
    await deleteShowcaseMember(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin showcase team delete error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Team member not found' });
    }
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

router.get('/testimonials', async (_req, res) => {
  try {
    const rows = await listAllTestimonials();
    res.json(rows);
  } catch (err) {
    console.error('Admin testimonials list error:', err);
    res.status(500).json({ error: 'Failed to load testimonials' });
  }
});

router.post('/testimonials', async (req, res) => {
  try {
    const row = await createShowcaseTestimonial(req.body);
    res.status(201).json(row);
  } catch (err) {
    console.error('Admin testimonial create error:', err);
    res.status(400).json({ error: err.message || 'Failed to create testimonial' });
  }
});

router.patch('/testimonials/:id', async (req, res) => {
  try {
    const row = await updateShowcaseTestimonial(req.params.id, req.body);
    res.json(row);
  } catch (err) {
    console.error('Admin testimonial update error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.status(400).json({ error: err.message || 'Failed to update testimonial' });
  }
});

router.delete('/testimonials/:id', async (req, res) => {
  try {
    await deleteShowcaseTestimonial(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin testimonial delete error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

export default router;
