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

export async function getMiningBalanceSummary(userId, tx = prisma) {
  const positions = await tx.miningPosition.findMany({
    where: { userId },
    select: { amount: true, totalEarned: true, status: true },
  });
  let earned = 0;
  let allocated = 0;
  for (const pos of positions) {
    earned += parseFloat(pos.totalEarned) || 0;
    if (pos.status === 'ACTIVE') allocated += parseFloat(pos.amount) || 0;
  }
  return {
    miningBalanceUsd: earned.toFixed(4),
    miningAllocatedUsd: allocated.toFixed(2),
  };
}

export async function getUserBalanceSummary(userId, tx = prisma) {
  const [entries, mining] = await Promise.all([
    tx.balanceEntry.findMany({ where: { userId } }),
    getMiningBalanceSummary(userId, tx),
  ]);
  const { credits, debits, available } = sumEntries(entries);
  return {
    availableUsd: Math.max(0, available).toFixed(2),
    totalCreditedUsd: credits.toFixed(2),
    totalDebitedUsd: debits.toFixed(2),
    miningBalanceUsd: mining.miningBalanceUsd,
    miningAllocatedUsd: mining.miningAllocatedUsd,
  };
}

export async function creditPaymentBalance(payment, tx = prisma) {
  if (!payment.userId) return null;
  if (payment.status !== 'SWEPT') return null;

  const paid = payment.paidAmount || payment.amount;
  const { usdAmount, usdRate } = await convertToUsd(paid, payment.tokenSymbol);
  const targetUsd = parseFloat(usdAmount);
  if (!(targetUsd > 0)) return null;

  const entries = await tx.balanceEntry.findMany({
    where: {
      userId: payment.userId,
      sourceType: 'PAYMENT',
      OR: [{ sourceId: payment.id }, { sourceId: { startsWith: `${payment.id}:` } }],
    },
  });
  const alreadyCredited = entries
    .filter((e) => e.type === 'CREDIT')
    .reduce((sum, e) => sum + (parseFloat(e.amountUsd) || 0), 0);
  const delta = Math.round((targetUsd - alreadyCredited) * 100) / 100;
  if (delta <= 0.00000001) {
    if (!payment.balanceCreditedAt) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { usdAmount, usdRate, balanceCreditedAt: new Date() },
      });
    }
    return { usdAmount, usdRate, credited: 0 };
  }

  const now = new Date();
  const sourceId =
    alreadyCredited > 0 ? `${payment.id}:topup:${Date.now()}` : payment.id;

  await tx.$transaction([
    tx.payment.update({
      where: { id: payment.id },
      data: { usdAmount, usdRate, balanceCreditedAt: payment.balanceCreditedAt || now },
    }),
    tx.balanceEntry.create({
      data: {
        userId: payment.userId,
        type: 'CREDIT',
        amountUsd: delta.toFixed(2),
        sourceType: 'PAYMENT',
        sourceId,
      },
    }),
  ]);

  console.log(
    `Balance credited: $${delta.toFixed(2)} USD for payment ${payment.id} (${paid} ${payment.tokenSymbol}, total ~$${targetUsd.toFixed(2)})`
  );

  return { usdAmount, usdRate, credited: delta };
}

export async function creditPackageIncome(userId, packageIncomeId, amountUsd, tx = prisma) {
  const num = parseFloat(amountUsd);
  if (isNaN(num) || num <= 0) return null;

  const existing = await tx.balanceEntry.findUnique({
    where: {
      sourceType_sourceId: {
        sourceType: 'PACKAGE_INCOME',
        sourceId: packageIncomeId,
      },
    },
  });
  if (existing) return existing;

  return tx.balanceEntry.create({
    data: {
      userId,
      type: 'CREDIT',
      amountUsd: num.toFixed(8),
      sourceType: 'PACKAGE_INCOME',
      sourceId: packageIncomeId,
    },
  });
}

export async function backfillPackageIncomeCredits() {
  const incomes = await prisma.packageIncome.findMany({
    select: {
      id: true,
      userId: true,
      amount: true,
      loanRepaymentUsd: true,
    },
  });

  let credited = 0;
  for (const income of incomes) {
    try {
      const existing = await prisma.balanceEntry.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: 'PACKAGE_INCOME',
            sourceId: income.id,
          },
        },
      });
      if (existing) continue;

      const amount = parseFloat(income.amount) || 0;
      const repaid = parseFloat(income.loanRepaymentUsd || '0') || 0;
      const net = Math.max(0, amount - repaid);
      if (net <= 0) continue;

      await creditPackageIncome(income.userId, income.id, net);
      credited += 1;
    } catch (err) {
      console.error(`Package income backfill failed for ${income.id}:`, err.message);
    }
  }

  if (credited > 0) {
    console.log(`Backfilled USD balance credits for ${credited} package income(s)`);
  }
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
      status: 'SWEPT',
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
      status: 'SWEPT',
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
