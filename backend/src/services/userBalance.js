import { prisma } from '../db.js';
import { convertToUsd } from './priceConversion.js';

function sumEntries(entries) {
  let credits = 0;
  let debits = 0;
  for (const entry of entries) {
    const amt = parseFloat(entry.amountUsd) || 0;
    if (entry.type === 'CREDIT') credits += amt;
    else debits += amt;
  }
  return { credits, debits, available: credits - debits };
}

export async function getUserBalanceSummary(userId, tx = prisma) {
  const entries = await tx.balanceEntry.findMany({ where: { userId } });
  const { credits, debits, available } = sumEntries(entries);
  return {
    availableUsd: Math.max(0, available).toFixed(2),
    totalCreditedUsd: credits.toFixed(2),
    totalDebitedUsd: debits.toFixed(2),
  };
}

export async function creditPaymentBalance(payment, tx = prisma) {
  if (!payment.userId) return null;
  if (payment.balanceCreditedAt) return null;
  if (payment.status !== 'CONFIRMED' && payment.status !== 'SWEPT') return null;

  const paid = payment.paidAmount || payment.amount;
  const { usdAmount, usdRate } = await convertToUsd(paid, payment.tokenSymbol);
  const usdNum = parseFloat(usdAmount);
  if (usdNum <= 0) return null;

  const existing = await tx.balanceEntry.findUnique({
    where: {
      sourceType_sourceId: {
        sourceType: 'PAYMENT',
        sourceId: payment.id,
      },
    },
  });
  if (existing) return existing;

  const now = new Date();
  await tx.$transaction([
    tx.payment.update({
      where: { id: payment.id },
      data: { usdAmount, usdRate, balanceCreditedAt: now },
    }),
    tx.balanceEntry.create({
      data: {
        userId: payment.userId,
        type: 'CREDIT',
        amountUsd: usdAmount,
        sourceType: 'PAYMENT',
        sourceId: payment.id,
      },
    }),
  ]);

  console.log(
    `Balance credited: ${usdAmount} USD for payment ${payment.id} (${paid} ${payment.tokenSymbol})`
  );

  return { usdAmount, usdRate };
}

export async function debitPackageInvestment(userId, investmentId, amountUsd, tx = prisma) {
  const num = parseFloat(amountUsd);
  if (isNaN(num) || num <= 0) throw new Error('Invalid debit amount');

  const balance = await getUserBalanceSummary(userId, tx);
  if (parseFloat(balance.availableUsd) < num) {
    throw new Error(`Insufficient balance. Available: $${balance.availableUsd} USD`);
  }

  await tx.balanceEntry.create({
    data: {
      userId,
      type: 'DEBIT',
      amountUsd: num.toFixed(2),
      sourceType: 'PACKAGE_INVESTMENT',
      sourceId: investmentId,
    },
  });
}

export async function ensureUserPaymentCredits(userId) {
  const payments = await prisma.payment.findMany({
    where: {
      userId,
      status: { in: ['CONFIRMED', 'SWEPT'] },
      balanceCreditedAt: null,
    },
  });

  for (const payment of payments) {
    try {
      await creditPaymentBalance(payment);
    } catch (err) {
      console.error(`Credit failed for payment ${payment.id}:`, err.message);
    }
  }
}

export async function backfillPaymentCredits() {
  const payments = await prisma.payment.findMany({
    where: {
      userId: { not: null },
      status: { in: ['CONFIRMED', 'SWEPT'] },
      balanceCreditedAt: null,
    },
  });

  let credited = 0;
  for (const payment of payments) {
    try {
      const result = await creditPaymentBalance(payment);
      if (result) credited += 1;
    } catch (err) {
      console.error(`Backfill credit failed for payment ${payment.id}:`, err.message);
    }
  }

  if (credited > 0) {
    console.log(`Backfilled USD balance credits for ${credited} payment(s)`);
  }
}

export async function getPaymentUsdStats(userId) {
  const payments = await prisma.payment.findMany({
    where: {
      userId,
      status: { in: ['CONFIRMED', 'SWEPT'] },
    },
    select: {
      id: true,
      usdAmount: true,
      paidAmount: true,
      amount: true,
      tokenSymbol: true,
      balanceCreditedAt: true,
    },
  });

  let totalPaidUsd = 0;
  let creditedCount = 0;

  for (const p of payments) {
    if (p.usdAmount) {
      totalPaidUsd += parseFloat(p.usdAmount) || 0;
      creditedCount += 1;
    }
  }

  return {
    confirmedPaymentCount: payments.length,
    creditedPaymentCount: creditedCount,
    totalPaidUsd: totalPaidUsd.toFixed(2),
  };
}

export async function transferUserBalance(fromUserId, toUserId, amountUsd, note, tx = prisma) {
  if (fromUserId === toUserId) throw new Error('Cannot transfer to yourself');

  const num = parseFloat(amountUsd);
  if (isNaN(num) || num <= 0) throw new Error('Invalid transfer amount');
  if (num > 1_000_000) throw new Error('Amount exceeds maximum transfer limit');

  const amount = num.toFixed(2);
  const balance = await getUserBalanceSummary(fromUserId, tx);
  if (parseFloat(balance.availableUsd) < num) {
    throw new Error(`Insufficient balance. Available: $${balance.availableUsd} USD`);
  }

  const recipient = await tx.user.findUnique({ where: { id: toUserId } });
  if (!recipient) throw new Error('Recipient not found');

  const transfer = await tx.userTransfer.create({
    data: {
      fromUserId,
      toUserId,
      amountUsd: amount,
      note: note?.trim()?.slice(0, 200) || null,
    },
  });

  await tx.balanceEntry.createMany({
    data: [
      {
        userId: fromUserId,
        type: 'DEBIT',
        amountUsd: amount,
        sourceType: 'USER_TRANSFER',
        sourceId: `${transfer.id}:debit`,
      },
      {
        userId: toUserId,
        type: 'CREDIT',
        amountUsd: amount,
        sourceType: 'USER_TRANSFER',
        sourceId: `${transfer.id}:credit`,
      },
    ],
  });

  return transfer;
}
