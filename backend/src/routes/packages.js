import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { calcDailyIncome } from '../services/packageAccrual.js';
import { formatPackage } from '../services/bootstrapPackages.js';
import { getUserBalanceSummary, ensureUserPaymentCredits } from '../services/userBalance.js';
import { processFirstPackageReferralCommission } from '../services/referrals.js';

const router = Router();

router.get('/plans', authMiddleware(true), async (_req, res) => {
  try {
    const packages = await prisma.package.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(packages.map(formatPackage));
  } catch (err) {
    console.error('Packages list error:', err);
    res.status(500).json({ error: 'Failed to load packages' });
  }
});

router.get('/dashboard', authMiddleware(true), async (req, res) => {
  try {
    const userId = req.user.id;
    await ensureUserPaymentCredits(userId);
    const [investments, recentIncome, balance] = await Promise.all([
      prisma.packageInvestment.findMany({
        where: { userId },
        include: { package: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.packageIncome.findMany({
        where: { userId },
        orderBy: { accrualDate: 'desc' },
        take: 15,
        include: {
          investment: { include: { package: true } },
        },
      }),
      getUserBalanceSummary(userId),
    ]);

    const allInvestments = await prisma.packageInvestment.findMany({
      where: { userId },
      select: { amount: true, totalEarned: true, status: true, package: { select: { dailyRate: true } } },
    });

    let totalInvested = 0;
    let totalEarned = 0;
    let activeInvested = 0;
    let activeCount = 0;
    let dailyIncomeUsd = 0;

    for (const inv of allInvestments) {
      const amt = parseFloat(inv.amount) || 0;
      const earned = parseFloat(inv.totalEarned) || 0;
      totalEarned += earned;
      if (inv.status === 'ACTIVE') {
        totalInvested += amt;
        activeInvested += amt;
        activeCount += 1;
        dailyIncomeUsd += parseFloat(calcDailyIncome(inv.amount, inv.package.dailyRate));
      } else if (inv.status === 'COMPLETED') {
        totalInvested += amt;
      }
    }

    res.json({
      overview: {
        activeInvestments: activeCount,
        activeInvested: activeInvested.toFixed(2),
        totalEarned: totalEarned.toFixed(8),
        totalInvested: totalInvested.toFixed(2),
        dailyIncomeUsd: dailyIncomeUsd.toFixed(4),
        availableUsd: balance.availableUsd,
        totalCreditedUsd: balance.totalCreditedUsd,
        totalDebitedUsd: balance.totalDebitedUsd,
      },
      investments: investments.map(formatInvestment),
      recentIncome: recentIncome.map((i) => ({
        id: i.id,
        amount: i.amount,
        tokenSymbol: i.tokenSymbol,
        accrualDate: i.accrualDate,
        packageName: i.investment.package.name,
      })),
    });
  } catch (err) {
    console.error('Packages dashboard error:', err);
    res.status(500).json({ error: 'Failed to load package dashboard' });
  }
});

router.get('/investments', authMiddleware(true), async (req, res) => {
  try {
    const investments = await prisma.packageInvestment.findMany({
      where: { userId: req.user.id },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(investments.map(formatInvestment));
  } catch (err) {
    console.error('Package investments error:', err);
    res.status(500).json({ error: 'Failed to load investments' });
  }
});

router.get('/income', authMiddleware(true), async (req, res) => {
  try {
    const incomes = await prisma.packageIncome.findMany({
      where: { userId: req.user.id },
      orderBy: { accrualDate: 'desc' },
      take: 100,
      include: { investment: { include: { package: true } } },
    });
    res.json(
      incomes.map((i) => ({
        id: i.id,
        amount: i.amount,
        tokenSymbol: i.tokenSymbol,
        accrualDate: i.accrualDate,
        packageName: i.investment.package.name,
        investmentId: i.investmentId,
      }))
    );
  } catch (err) {
    console.error('Package income error:', err);
    res.status(500).json({ error: 'Failed to load income history' });
  }
});

router.post('/invest', authMiddleware(true), async (req, res) => {
  try {
    const packageId = req.body.packageId || req.body.planId;
    const { amount } = req.body;
    const num = parseFloat(amount);

    if (!packageId || isNaN(num) || num <= 0) {
      return res.status(400).json({ error: 'Valid package and amount are required' });
    }

    const pkg = await prisma.package.findFirst({
      where: { id: packageId, active: true },
    });

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found or inactive' });
    }

    const min = parseFloat(pkg.minAmount);
    const max = pkg.maxAmount ? parseFloat(pkg.maxAmount) : Infinity;

    if (num < min) {
      return res.status(400).json({ error: `Minimum investment for ${pkg.name} is ${pkg.minAmount} USD` });
    }
    if (num > max) {
      return res.status(400).json({ error: `Maximum investment for ${pkg.name} is ${pkg.maxAmount} USD` });
    }

    const endsAt = new Date();
    endsAt.setUTCDate(endsAt.getUTCDate() + pkg.durationDays);

    await ensureUserPaymentCredits(req.user.id);

    const investment = await prisma.$transaction(async (tx) => {
      const balance = await getUserBalanceSummary(req.user.id, tx);
      if (parseFloat(balance.availableUsd) < num) {
        throw new Error(`Insufficient balance. Available: $${balance.availableUsd} USD`);
      }

      const inv = await tx.packageInvestment.create({
        data: {
          userId: req.user.id,
          planId: pkg.id,
          amount: String(num),
          tokenSymbol: 'USD',
          endsAt,
        },
        include: { package: true },
      });

      await tx.balanceEntry.create({
        data: {
          userId: req.user.id,
          type: 'DEBIT',
          amountUsd: num.toFixed(2),
          sourceType: 'PACKAGE_INVESTMENT',
          sourceId: inv.id,
        },
      });

      await processFirstPackageReferralCommission({
        inviteeId: req.user.id,
        investmentId: inv.id,
        packageAmountUsd: String(num),
        tx,
      });

      return inv;
    });

    res.status(201).json(formatInvestment(investment));
  } catch (err) {
    if (err.message?.includes('Insufficient balance')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Package invest error:', err);
    res.status(500).json({ error: 'Failed to create investment' });
  }
});

function formatInvestment(inv) {
  const dailyIncome = calcDailyIncome(inv.amount, inv.package.dailyRate);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(inv.endsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );
  return {
    id: inv.id,
    amount: inv.amount,
    tokenSymbol: inv.tokenSymbol,
    status: inv.status,
    totalEarned: inv.totalEarned,
    dailyIncome,
    dailyRate: inv.package.dailyRate,
    startedAt: inv.startedAt,
    endsAt: inv.endsAt,
    lastAccruedAt: inv.lastAccruedAt,
    daysLeft,
    package: {
      id: inv.package.id,
      name: inv.package.name,
      slug: inv.package.slug,
      durationDays: inv.package.durationDays,
      badgeColor: inv.package.badgeColor,
      description: inv.package.description,
    },
  };
}

export default router;
