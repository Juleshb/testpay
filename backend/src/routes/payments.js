import { Router } from 'express';
import { prisma } from '../db.js';
import { config } from '../config/index.js';
import {
  getNextDerivationIndex,
  getDepositAddress,
  getPaymentBalance,
} from '../services/wallet.js';
import { getPaymentStatus, confirmFromBalance, MIN_CONFIRM_AMOUNT } from '../services/paymentMonitor.js';
import { validatePaymentRequest, getNetwork } from '../config/networks.js';
import { authMiddleware } from '../middleware/auth.js';
import { getUserBalanceSummary, getPaymentUsdStats, ensureUserPaymentCredits } from '../services/userBalance.js';
import { convertUsdToToken } from '../services/priceConversion.js';

const router = Router();

router.get('/stats/dashboard', authMiddleware(true), async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        chainId: true,
        tokenSymbol: true,
        status: true,
        depositAddress: true,
        createdAt: true,
        paidAt: true,
        usdAmount: true,
      },
    });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const byStatus = { PENDING: 0, CONFIRMED: 0, SWEPT: 0, EXPIRED: 0 };
    const byNetwork = {};
    const byToken = {};
    let volumeTotal = 0;
    let volumeConfirmed = 0;
    let paymentsToday = 0;

    for (const p of payments) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;

      const netName = getNetwork(p.chainId)?.name || `Chain ${p.chainId}`;
      byNetwork[netName] = (byNetwork[netName] || 0) + 1;
      byToken[p.tokenSymbol] = (byToken[p.tokenSymbol] || 0) + 1;

      const amt = parseFloat(p.amount) || 0;
      volumeTotal += amt;
      if (p.status === 'CONFIRMED' || p.status === 'SWEPT') {
        volumeConfirmed += parseFloat(p.paidAmount || p.amount) || amt;
      }
      if (new Date(p.createdAt) >= startOfDay) paymentsToday += 1;
    }

    const total = payments.length;
    const completed = byStatus.CONFIRMED + byStatus.SWEPT;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    await ensureUserPaymentCredits(req.user.id);
    const [balance, paymentUsd] = await Promise.all([
      getUserBalanceSummary(req.user.id),
      getPaymentUsdStats(req.user.id),
    ]);

    res.json({
      overview: {
        total,
        pending: byStatus.PENDING,
        confirmed: byStatus.CONFIRMED,
        swept: byStatus.SWEPT,
        expired: byStatus.EXPIRED,
        completed,
        paymentsToday,
        successRate,
        confirmedPaymentCount: paymentUsd.confirmedPaymentCount,
      },
      balance: {
        availableUsd: balance.availableUsd,
        totalCreditedUsd: balance.totalCreditedUsd,
        totalDebitedUsd: balance.totalDebitedUsd,
        totalPaidUsd: paymentUsd.totalPaidUsd,
      },
      volume: {
        totalRequests: total,
        approximateVolume: volumeTotal.toFixed(4),
        confirmedVolume: volumeConfirmed.toFixed(4),
        totalPaidUsd: paymentUsd.totalPaidUsd,
      },
      breakdown: {
        byNetwork: Object.entries(byNetwork)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        byToken: Object.entries(byToken)
          .map(([symbol, count]) => ({ symbol, count }))
          .sort((a, b) => b.count - a.count),
        byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      },
      recentPayments: payments.slice(0, 8).map((p) => ({
        ...p,
        networkName: getNetwork(p.chainId)?.name || `Chain ${p.chainId}`,
        usdValue: p.usdAmount ? `$${p.usdAmount}` : null,
      })),
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

router.get('/stats/balance', authMiddleware(true), async (req, res) => {
  try {
    await ensureUserPaymentCredits(req.user.id);
    const [balance, paymentUsd] = await Promise.all([
      getUserBalanceSummary(req.user.id),
      getPaymentUsdStats(req.user.id),
    ]);
    res.json({
      ...balance,
      totalPaidUsd: paymentUsd.totalPaidUsd,
      confirmedPaymentCount: paymentUsd.confirmedPaymentCount,
    });
  } catch (err) {
    console.error('Balance stats error:', err);
    res.status(500).json({ error: 'Failed to load balance' });
  }
});

router.post('/', authMiddleware(true), async (req, res) => {
  try {
    const { amount, amountUsd, email, name, chainId, tokenSymbol } = req.body;

    const resolvedChainId = chainId ? parseInt(chainId, 10) : config.defaultChainId;
    const resolvedToken = tokenSymbol || getNetwork(resolvedChainId)?.nativeSymbol;

    const validation = validatePaymentRequest(resolvedChainId, resolvedToken);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    let tokenAmount = amount != null ? String(amount) : null;
    let usdAmount = null;
    let usdRate = null;

    if (amountUsd != null && amountUsd !== '') {
      const usdNum = parseFloat(amountUsd);
      if (isNaN(usdNum) || usdNum <= 0) {
        return res.status(400).json({ error: 'Valid USD amount is required' });
      }
      const decimals = Math.min(validation.token.decimals, 8);
      const converted = await convertUsdToToken(usdNum, resolvedToken, decimals);
      if (!(parseFloat(converted.tokenAmount) > 0)) {
        return res.status(400).json({ error: 'Converted token amount is too small' });
      }
      tokenAmount = converted.tokenAmount;
      usdAmount = usdNum.toFixed(2);
      usdRate = converted.usdRate;
    } else if (!tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const derivationIndex = await getNextDerivationIndex(prisma);
    const depositAddress = getDepositAddress(derivationIndex);

    const payment = await prisma.payment.create({
      data: {
        amount: String(tokenAmount),
        chainId: resolvedChainId,
        tokenSymbol: resolvedToken,
        tokenAddress: validation.token.address,
        email: email || req.user.email,
        name: name || req.user.name,
        depositAddress,
        derivationIndex,
        userId: req.user.id,
        ...(usdAmount ? { usdAmount, usdRate } : {}),
      },
    });

    res.status(201).json(formatPaymentResponse(payment));
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment' });
  }
});

router.post('/:id/tx', authMiddleware(true), async (req, res) => {
  try {
    const { txHash } = req.body;
    if (!txHash || typeof txHash !== 'string') {
      return res.status(400).json({ error: 'txHash is required' });
    }

    const payment = await findAccessiblePayment(req.params.id, req.user);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const received = await getPaymentBalance(
      payment.depositAddress,
      payment.chainId,
      payment.tokenSymbol
    );
    const receivedNum = parseFloat(received) || 0;
    const hasDeposit = receivedNum > MIN_CONFIRM_AMOUNT;

    let updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { txHash },
    });

    if (hasDeposit && updated.status === 'PENDING') {
      updated = (await confirmFromBalance(updated, received, { txHash })) || updated;
    }

    res.json(formatPaymentResponse(updated));
  } catch (err) {
    console.error('Register tx error:', err);
    res.status(500).json({ error: 'Failed to register transaction' });
  }
});

router.get('/:id', authMiddleware(true), async (req, res) => {
  try {
    const payment = await findAccessiblePayment(req.params.id, req.user);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const status = await getPaymentStatus(payment.id);
    res.json(formatPaymentResponse(status));
  } catch (err) {
    console.error('Get payment error:', err);
    res.status(500).json({ error: 'Failed to get payment' });
  }
});

router.get('/:id/balance', authMiddleware(true), async (req, res) => {
  try {
    const payment = await findAccessiblePayment(req.params.id, req.user);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const received = await getPaymentBalance(
      payment.depositAddress,
      payment.chainId,
      payment.tokenSymbol
    );
    const required = parseFloat(payment.amount);
    const receivedNum = parseFloat(received);
    const hasDeposit = receivedNum > MIN_CONFIRM_AMOUNT;

    res.json({
      depositAddress: payment.depositAddress,
      requiredAmount: payment.amount,
      receivedAmount: received,
      tokenSymbol: payment.tokenSymbol,
      chainId: payment.chainId,
      isSufficient: receivedNum >= required,
      hasDeposit,
      status: payment.status,
    });
  } catch (err) {
    console.error('Balance check error:', err);
    res.status(500).json({ error: 'Failed to check balance' });
  }
});

router.get('/', authMiddleware(true), async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(payments.map(formatPaymentResponse));
  } catch (err) {
    console.error('List payments error:', err);
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

async function findAccessiblePayment(id, user) {
  if (user.role === 'ADMIN') {
    return prisma.payment.findUnique({ where: { id } });
  }
  return prisma.payment.findFirst({ where: { id, userId: user.id } });
}

function formatPaymentResponse(payment) {
  const network = getNetwork(payment.chainId);
  return {
    ...payment,
    networkName: network?.name || `Chain ${payment.chainId}`,
    treasuryAddress: config.treasuryAddress,
  };
}

export default router;
