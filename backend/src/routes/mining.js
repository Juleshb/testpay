import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { calcDailyIncome, computeMiningEndsAt, usesHourSession } from '../services/miningAccrual.js';
import { formatMiningOption } from '../services/bootstrapMining.js';
import { getUserBalanceSummary, ensureUserPaymentCredits } from '../services/userBalance.js';

const router = Router();

router.get('/plans', authMiddleware(true), async (_req, res) => {
  try {
    const options = await prisma.miningOption.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(options.map(formatMiningOption));
  } catch (err) {
    console.error('Mining plans list error:', err);
    res.status(500).json({ error: 'Failed to load mining options' });
  }
});

router.get('/dashboard', authMiddleware(true), async (req, res) => {
  try {
    const userId = req.user.id;
    await ensureUserPaymentCredits(userId);
    const [positions, recentIncome, balance] = await Promise.all([
      prisma.miningPosition.findMany({
        where: { userId },
        include: { option: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.miningIncome.findMany({
        where: { userId },
        orderBy: { accrualDate: 'desc' },
        take: 15,
        include: {
          position: { include: { option: true } },
        },
      }),
      getUserBalanceSummary(userId),
    ]);

    const allPositions = await prisma.miningPosition.findMany({
      where: { userId },
      select: {
        amount: true,
        totalEarned: true,
        status: true,
        option: { select: { dailyRate: true } },
      },
    });

    let totalInvested = 0;
    let totalEarned = 0;
    let activeInvested = 0;
    let activeCount = 0;
    let dailyIncomeUsd = 0;

    for (const pos of allPositions) {
      const amt = parseFloat(pos.amount) || 0;
      const earned = parseFloat(pos.totalEarned) || 0;
      totalEarned += earned;
      if (pos.status === 'ACTIVE') {
        totalInvested += amt;
        activeInvested += amt;
        activeCount += 1;
        dailyIncomeUsd += parseFloat(calcDailyIncome(pos.amount, pos.option.dailyRate));
      } else if (pos.status === 'COMPLETED') {
        totalInvested += amt;
      }
    }

    res.json({
      overview: {
        activePositions: activeCount,
        activeInvested: activeInvested.toFixed(2),
        totalEarned: totalEarned.toFixed(8),
        miningBalanceUsd: totalEarned.toFixed(4),
        totalInvested: totalInvested.toFixed(2),
        dailyIncomeUsd: dailyIncomeUsd.toFixed(4),
        availableUsd: balance.availableUsd,
        totalCreditedUsd: balance.totalCreditedUsd,
        totalDebitedUsd: balance.totalDebitedUsd,
      },
      positions: positions.map(formatPosition),
      recentIncome: recentIncome.map((i) => ({
        id: i.id,
        amount: i.amount,
        tokenSymbol: i.tokenSymbol,
        accrualDate: i.accrualDate,
        optionName: i.position.option.name,
      })),
    });
  } catch (err) {
    console.error('Mining dashboard error:', err);
    res.status(500).json({ error: 'Failed to load mining dashboard' });
  }
});

router.get('/positions', authMiddleware(true), async (req, res) => {
  try {
    const positions = await prisma.miningPosition.findMany({
      where: { userId: req.user.id },
      include: { option: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(positions.map(formatPosition));
  } catch (err) {
    console.error('Mining positions error:', err);
    res.status(500).json({ error: 'Failed to load mining positions' });
  }
});

router.get('/income', authMiddleware(true), async (req, res) => {
  try {
    const incomes = await prisma.miningIncome.findMany({
      where: { userId: req.user.id },
      orderBy: { accrualDate: 'desc' },
      take: 100,
      include: { position: { include: { option: true } } },
    });
    res.json(
      incomes.map((i) => ({
        id: i.id,
        amount: i.amount,
        tokenSymbol: i.tokenSymbol,
        accrualDate: i.accrualDate,
        optionName: i.position.option.name,
        positionId: i.positionId,
      }))
    );
  } catch (err) {
    console.error('Mining income error:', err);
    res.status(500).json({ error: 'Failed to load mining income history' });
  }
});

router.post('/start', authMiddleware(true), async (req, res) => {
  try {
    const optionId = req.body.optionId;
    const { amount } = req.body;

    if (!optionId) {
      return res.status(400).json({ error: 'Valid mining option is required' });
    }

    const option = await prisma.miningOption.findFirst({
      where: { id: optionId, active: true },
    });

    if (!option) {
      return res.status(404).json({ error: 'Mining option not found or inactive' });
    }

    const isFree = Boolean(option.isFree);
    const num = isFree ? parseFloat(option.minAmount) : parseFloat(amount);

    if (isNaN(num) || num <= 0) {
      return res.status(400).json({ error: 'Valid mining option and amount are required' });
    }

    if (!isFree) {
      const min = parseFloat(option.minAmount);
      const max = option.maxAmount ? parseFloat(option.maxAmount) : Infinity;

      if (num < min) {
        return res.status(400).json({
          error: `Minimum for ${option.name} is ${option.minAmount} USD`,
        });
      }
      if (num > max) {
        return res.status(400).json({
          error: `Maximum for ${option.name} is ${option.maxAmount} USD`,
        });
      }
    }

    const startedAt = new Date();
    const endsAt = computeMiningEndsAt(startedAt, option);
    const sessionHours = usesHourSession(option) ? option.sessionHours : null;

    await ensureUserPaymentCredits(req.user.id);

    const position = await prisma.$transaction(async (tx) => {
      const existingOnOption = await tx.miningPosition.findFirst({
        where: {
          userId: req.user.id,
          optionId: option.id,
          status: 'ACTIVE',
        },
      });
      if (existingOnOption) {
        throw new Error('You already have an active miner on this plan.');
      }

      if (isFree) {
        const existingFree = await tx.miningPosition.findFirst({
          where: {
            userId: req.user.id,
            status: 'ACTIVE',
            startedIsFree: true,
          },
        });
        if (existingFree) {
          throw new Error('You already have an active free miner. Wait until it completes.');
        }
      } else {
        const balance = await getUserBalanceSummary(req.user.id, tx);
        if (parseFloat(balance.availableUsd) < num) {
          throw new Error(`Insufficient balance. Available: $${balance.availableUsd} USD`);
        }
      }

      const pos = await tx.miningPosition.create({
        data: {
          userId: req.user.id,
          optionId: option.id,
          amount: String(num),
          tokenSymbol: 'USD',
          startedIsFree: isFree,
          sessionHours,
          startedAt,
          endsAt,
        },
        include: { option: true },
      });

      if (!isFree) {
        await tx.balanceEntry.create({
          data: {
            userId: req.user.id,
            type: 'DEBIT',
            amountUsd: num.toFixed(2),
            sourceType: 'MINING_PURCHASE',
            sourceId: pos.id,
          },
        });
      }

      return pos;
    });

    res.status(201).json(formatPosition(position));
  } catch (err) {
    if (
      err.message?.includes('Insufficient balance') ||
      err.message?.includes('already have an active free miner') ||
      err.message?.includes('already have an active miner on this plan')
    ) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Mining start error:', err);
    res.status(500).json({ error: 'Failed to start mining position' });
  }
});

function formatPosition(pos) {
  const dailyIncome = calcDailyIncome(pos.amount, pos.option.dailyRate);
  const msLeft = Math.max(0, new Date(pos.endsAt).getTime() - Date.now());
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const hoursLeft = Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000)));
  const sessionHours = pos.sessionHours ?? (usesHourSession(pos.option) ? pos.option.sessionHours : null);

  return {
    id: pos.id,
    amount: pos.amount,
    tokenSymbol: pos.tokenSymbol,
    status: pos.status,
    totalEarned: pos.totalEarned,
    startedIsFree: Boolean(pos.startedIsFree),
    sessionHours,
    dailyIncome,
    dailyRate: pos.option.dailyRate,
    startedAt: pos.startedAt,
    endsAt: pos.endsAt,
    lastAccruedAt: pos.lastAccruedAt,
    daysLeft,
    hoursLeft,
    option: {
      id: pos.option.id,
      name: pos.option.name,
      slug: pos.option.slug,
      minAmount: pos.option.minAmount,
      durationDays: pos.option.durationDays,
      sessionHours: pos.option.sessionHours,
      hashRate: pos.option.hashRate,
      coin: pos.option.coin,
      badgeColor: pos.option.badgeColor,
      description: pos.option.description,
      isFree: Boolean(pos.option.isFree),
    },
  };
}

export default router;
