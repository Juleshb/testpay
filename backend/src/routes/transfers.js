import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { findUserByIdentifier, userDisplayLabel } from '../utils/authHelpers.js';
import { getUserBalanceSummary, transferUserBalance } from '../services/userBalance.js';

const router = Router();

const userPublicSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  phone: true,
};

function recipientLabel(user) {
  return userDisplayLabel(user);
}

function formatTransfer(transfer, currentUserId) {
  const isSender = transfer.fromUserId === currentUserId;
  const counterparty = isSender ? transfer.toUser : transfer.fromUser;
  return {
    id: transfer.id,
    direction: isSender ? 'sent' : 'received',
    amountUsd: transfer.amountUsd,
    note: transfer.note,
    createdAt: transfer.createdAt,
    counterparty: {
      id: counterparty.id,
      username: counterparty.username,
      name: counterparty.name,
      label: recipientLabel(counterparty),
    },
  };
}

router.use(authMiddleware(true));

router.get('/balance', async (req, res) => {
  try {
    const balance = await getUserBalanceSummary(req.user.id);
    res.json(balance);
  } catch (err) {
    console.error('Transfer balance error:', err);
    res.status(500).json({ error: 'Failed to load balance' });
  }
});

router.get('/lookup', async (req, res) => {
  try {
    const identifier = String(req.query.identifier || '').trim();
    if (!identifier) {
      return res.status(400).json({ error: 'Username, email, or phone is required' });
    }

    const user = await findUserByIdentifier(prisma, identifier);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      label: recipientLabel(user),
    });
  } catch (err) {
    console.error('Transfer lookup error:', err);
    res.status(500).json({ error: 'Failed to look up recipient' });
  }
});

router.post('/', async (req, res) => {
  try {
    const identifier = String(req.body.recipient || req.body.identifier || '').trim();
    const { amountUsd, note } = req.body;

    if (!identifier) return res.status(400).json({ error: 'Recipient username, email, or phone is required' });
    if (!amountUsd) return res.status(400).json({ error: 'Amount is required' });

    const recipient = await findUserByIdentifier(prisma, identifier);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    if (recipient.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    const transfer = await prisma.$transaction(async (tx) =>
      transferUserBalance(req.user.id, recipient.id, amountUsd, note, tx)
    );

    const full = await prisma.userTransfer.findUnique({
      where: { id: transfer.id },
      include: {
        fromUser: { select: userPublicSelect },
        toUser: { select: userPublicSelect },
      },
    });

    const balance = await getUserBalanceSummary(req.user.id);
    res.status(201).json({
      transfer: formatTransfer(full, req.user.id),
      balance,
    });
  } catch (err) {
    console.error('Transfer error:', err);
    const message = err.message || 'Failed to transfer funds';
    const status =
      message.includes('Insufficient') ||
      message.includes('Invalid') ||
      message.includes('Cannot transfer')
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

    const transfers = await prisma.userTransfer.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: {
        fromUser: { select: userPublicSelect },
        toUser: { select: userPublicSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      transfers: transfers.map((t) => formatTransfer(t, userId)),
    });
  } catch (err) {
    console.error('Transfer history error:', err);
    res.status(500).json({ error: 'Failed to load transfer history' });
  }
});

export default router;
