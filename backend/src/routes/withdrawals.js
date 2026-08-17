import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getUserBalanceSummary } from '../services/userBalance.js';
import {
  getWithdrawOptions,
  requestWithdrawal,
  formatWithdrawal,
  getSavedWithdrawWallet,
  saveWithdrawWallet,
} from '../services/withdrawals.js';

const router = Router();

router.use(authMiddleware(true));

router.get('/options', async (req, res) => {
  try {
    const options = await getWithdrawOptions(req.user.id);
    res.json(options);
  } catch (err) {
    console.error('Withdraw options error:', err);
    res.status(500).json({ error: 'Failed to load withdraw options' });
  }
});

router.get('/balance', async (req, res) => {
  try {
    const [balance, savedWallet] = await Promise.all([
      getUserBalanceSummary(req.user.id),
      getSavedWithdrawWallet(req.user.id),
    ]);
    res.json({ ...balance, savedWallet });
  } catch (err) {
    console.error('Withdraw balance error:', err);
    res.status(500).json({ error: 'Failed to load balance' });
  }
});

router.get('/saved-wallet', async (req, res) => {
  try {
    const savedWallet = await getSavedWithdrawWallet(req.user.id);
    res.json({ savedWallet });
  } catch (err) {
    console.error('Saved wallet get error:', err);
    res.status(500).json({ error: 'Failed to load saved wallet' });
  }
});

router.put('/saved-wallet', async (req, res) => {
  try {
    const { destinationAddress, chainId, tokenSymbol } = req.body;
    if (!destinationAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    const savedWallet = await saveWithdrawWallet(req.user.id, {
      destinationAddress,
      chainId,
      tokenSymbol,
    });
    res.json({ savedWallet });
  } catch (err) {
    console.error('Saved wallet update error:', err);
    res.status(400).json({ error: err.message || 'Failed to save wallet' });
  }
});

router.delete('/saved-wallet', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        savedWithdrawAddress: null,
        savedWithdrawChainId: null,
        savedWithdrawToken: null,
      },
    });
    res.json({ savedWallet: null });
  } catch (err) {
    console.error('Saved wallet clear error:', err);
    res.status(500).json({ error: 'Failed to clear saved wallet' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { amountUsd, chainId, tokenSymbol, destinationAddress } = req.body;

    if (!amountUsd || !chainId || !tokenSymbol || !destinationAddress) {
      return res.status(400).json({ error: 'Amount, network, token, and wallet address are required' });
    }

    const withdrawal = await prisma.$transaction(async (tx) =>
      requestWithdrawal(
        req.user.id,
        {
          amountUsd,
          chainId: parseInt(chainId, 10),
          tokenSymbol: String(tokenSymbol).toUpperCase(),
          destinationAddress: String(destinationAddress).trim(),
        },
        tx
      )
    );

    const [balance, savedWallet] = await Promise.all([
      getUserBalanceSummary(req.user.id),
      getSavedWithdrawWallet(req.user.id),
    ]);
    res.status(201).json({
      withdrawal: formatWithdrawal(withdrawal),
      balance: { ...balance, savedWallet },
    });
  } catch (err) {
    console.error('Withdraw request error:', err);
    const message = err.message || 'Failed to request withdrawal';
    const status =
      err.status ||
      (message.includes('Insufficient') ||
      message.includes('Invalid') ||
      message.includes('Minimum') ||
      message.includes('Maximum') ||
      message.includes('Daily') ||
      message.includes('fee') ||
      message.includes('supported')
        ? 400
        : 500);
    res.status(status).json({ error: message });
  }
});

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const status = String(req.query.status || '')
      .trim()
      .toUpperCase();
    const where = { userId: req.user.id };
    if (['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.withdrawal.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      withdrawals: withdrawals.map(formatWithdrawal),
      total,
      limit,
    });
  } catch (err) {
    console.error('Withdraw history error:', err);
    res.status(500).json({ error: 'Failed to load withdrawal history' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const withdrawal = await prisma.withdrawal.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    res.json({ withdrawal: formatWithdrawal(withdrawal) });
  } catch (err) {
    console.error('Withdraw detail error:', err);
    res.status(500).json({ error: 'Failed to load withdrawal' });
  }
});

export default router;
