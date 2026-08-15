import { ethers } from 'ethers';
import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { getNetwork, validatePaymentRequest, getNetworksList } from '../config/networks.js';
import { convertUsdToToken } from './priceConversion.js';
import { getUserBalanceSummary } from './userBalance.js';
import { sendFromPayoutWallet, getPayoutLiquidity, sanitizeWithdrawFailure, getPayoutAddress } from './wallet.js';
import { notifyTreasuryChanged } from './treasuryRealtime.js';
import {
  calcWithdrawFee,
  getUserWithdrawUsage,
  getWithdrawSettings,
} from './withdrawSettings.js';

export async function getWithdrawOptions(userId = null) {
  const settings = await getWithdrawSettings();
  const liquidity = await getPayoutLiquidity();
  const funded = new Map(
    liquidity.balances.map((row) => [`${row.chainId}:${row.tokenSymbol}`, row])
  );

  const networks = getNetworksList()
    .map((network) => {
      const tokens = network.tokens
        .map((t) => {
          const liq = funded.get(`${network.chainId}:${t.symbol}`);
          if (!liq) return null;
          return {
            symbol: t.symbol,
            name: t.name,
            decimals: t.decimals,
            isNative: !!t.isNative || t.address == null,
            availableUsd: liq.availableUsd,
            availableBalance: liq.balance,
            usdRate: liq.usdRate,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const prefer = (s) => (s === 'USDC' || s === 'USDT' ? 0 : 1);
          return prefer(a.symbol) - prefer(b.symbol) || a.symbol.localeCompare(b.symbol);
        });
      if (tokens.length === 0) return null;
      return {
        chainId: network.chainId,
        name: network.name,
        explorer: network.explorer,
        tokens,
      };
    })
    .filter(Boolean);

  const usage = userId ? await getUserWithdrawUsage(userId) : null;
  const remainingCount = usage
    ? Math.max(0, settings.maxWithdrawalsPerDay - usage.count)
    : settings.maxWithdrawalsPerDay;
  const remainingVolume = usage
    ? Math.max(0, parseFloat(settings.maxWithdrawUsdPerDay) - parseFloat(usage.volumeUsd))
    : parseFloat(settings.maxWithdrawUsdPerDay);

  const preferredDefault =
    networks.find((n) => n.chainId === config.defaultChainId)?.chainId ||
    networks[0]?.chainId ||
    config.defaultChainId;

  return {
    networks,
    liquidityCheckedAt: liquidity.checkedAt,
    minWithdrawUsd: parseFloat(settings.minWithdrawUsd),
    maxWithdrawUsd: parseFloat(settings.maxWithdrawUsd),
    maxWithdrawUsdPerDay: parseFloat(settings.maxWithdrawUsdPerDay),
    maxWithdrawalsPerDay: settings.maxWithdrawalsPerDay,
    feePercent: parseFloat(settings.feePercent),
    feeFlatUsd: parseFloat(settings.feeFlatUsd),
    defaultChainId: preferredDefault,
    defaultToken: networks
      .find((n) => n.chainId === preferredDefault)
      ?.tokens?.some((t) => t.symbol === 'USDC')
      ? 'USDC'
      : networks.find((n) => n.chainId === preferredDefault)?.tokens?.[0]?.symbol || 'USDC',
    usage: usage
      ? {
          count: usage.count,
          volumeUsd: usage.volumeUsd,
          remainingCount,
          remainingVolumeUsd: remainingVolume.toFixed(2),
          windowHours: 24,
        }
      : null,
  };
}

function formatWithdrawal(withdrawal) {
  const network = getNetwork(withdrawal.chainId);
  const feeUsd = withdrawal.feeUsd || '0';
  const netAmountUsd =
    withdrawal.netAmountUsd ||
    (parseFloat(withdrawal.amountUsd) - parseFloat(feeUsd)).toFixed(2);
  return {
    id: withdrawal.id,
    amountUsd: withdrawal.amountUsd,
    feeUsd,
    netAmountUsd,
    tokenAmount: withdrawal.tokenAmount,
    tokenSymbol: withdrawal.tokenSymbol,
    chainId: withdrawal.chainId,
    networkName: network?.name || `Chain ${withdrawal.chainId}`,
    explorer: network?.explorer || null,
    destinationAddress: withdrawal.destinationAddress,
    status: withdrawal.status,
    txHash: withdrawal.txHash,
    failureReason: withdrawal.failureReason
      ? sanitizeWithdrawFailure({ message: withdrawal.failureReason })
      : null,
    processedAt: withdrawal.processedAt,
    createdAt: withdrawal.createdAt,
  };
}

export async function requestWithdrawal(
  userId,
  { amountUsd, chainId, tokenSymbol, destinationAddress },
  tx = prisma
) {
  const settings = await getWithdrawSettings(tx);
  const amountNum = parseFloat(amountUsd);
  const minUsd = parseFloat(settings.minWithdrawUsd);
  const maxUsd = parseFloat(settings.maxWithdrawUsd);
  const maxPerDay = parseFloat(settings.maxWithdrawUsdPerDay);

  if (isNaN(amountNum) || amountNum <= 0) throw new Error('Invalid withdrawal amount');
  if (amountNum < minUsd) {
    throw new Error(`Minimum withdrawal is $${minUsd.toFixed(2)}`);
  }
  if (amountNum > maxUsd) {
    throw new Error(`Maximum withdrawal is $${maxUsd.toFixed(2)}`);
  }

  if (!ethers.isAddress(destinationAddress)) {
    throw new Error('Invalid wallet address');
  }

  const validation = validatePaymentRequest(chainId, tokenSymbol);
  if (!validation.valid) throw new Error(validation.error);

  const usage = await getUserWithdrawUsage(userId, tx);
  if (usage.count >= settings.maxWithdrawalsPerDay) {
    throw new Error(
      `Daily withdrawal limit reached (${settings.maxWithdrawalsPerDay} per 24 hours)`
    );
  }

  const usedVolume = parseFloat(usage.volumeUsd) || 0;
  if (usedVolume + amountNum > maxPerDay + 0.00000001) {
    const remaining = Math.max(0, maxPerDay - usedVolume);
    throw new Error(
      `Daily volume limit is $${maxPerDay.toFixed(2)}. Remaining today: $${remaining.toFixed(2)}`
    );
  }

  const fee = calcWithdrawFee(amountNum, settings);
  const netNum = parseFloat(fee.netAmountUsd);
  if (netNum <= 0) {
    throw new Error('Withdrawal fee leaves nothing to send. Increase the amount.');
  }

  const liquidity = await getPayoutLiquidity();
  const liq = liquidity.balances.find(
    (row) =>
      row.chainId === parseInt(chainId, 10) &&
      row.tokenSymbol === tokenSymbol.toUpperCase()
  );
  const liqUsd = parseFloat(liq?.availableUsd || '0');
  if (!liq || liqUsd + 0.00000001 < netNum) {
    throw new Error(
      'This network is temporarily unavailable for withdrawals. Please choose another network or try again later.'
    );
  }

  const balance = await getUserBalanceSummary(userId, tx);
  if (parseFloat(balance.availableUsd) < amountNum) {
    throw new Error(`Insufficient balance. Available: $${balance.availableUsd} USD`);
  }

  const amountDecimals = Math.min(validation.token.decimals, 8);
  const { tokenAmount } = await convertUsdToToken(
    fee.netAmountUsd,
    tokenSymbol,
    amountDecimals
  );
  if (parseFloat(tokenAmount) <= 0) {
    throw new Error('Converted token amount is too small');
  }

  // Re-check token units against on-chain liquidity balance
  if (parseFloat(liq.balance) + 0.00000001 < parseFloat(tokenAmount)) {
    throw new Error(
      'This network is temporarily unavailable for withdrawals. Please choose another network or try again later.'
    );
  }

  const withdrawal = await tx.withdrawal.create({
    data: {
      userId,
      amountUsd: amountNum.toFixed(2),
      feeUsd: fee.feeUsd,
      netAmountUsd: fee.netAmountUsd,
      chainId,
      tokenSymbol: tokenSymbol.toUpperCase(),
      tokenAmount,
      tokenAddress: validation.token.address,
      destinationAddress: ethers.getAddress(destinationAddress),
      status: 'PENDING',
    },
  });

  await tx.balanceEntry.create({
    data: {
      userId,
      type: 'DEBIT',
      amountUsd: amountNum.toFixed(2),
      sourceType: 'WITHDRAWAL',
      sourceId: withdrawal.id,
    },
  });

  await persistWithdrawWallet(
    userId,
    {
      destinationAddress: withdrawal.destinationAddress,
      chainId,
      tokenSymbol: tokenSymbol.toUpperCase(),
    },
    tx
  );

  return withdrawal;
}

export async function getSavedWithdrawWallet(userId, tx = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      savedWithdrawAddress: true,
      savedWithdrawChainId: true,
      savedWithdrawToken: true,
    },
  });
  if (!user?.savedWithdrawAddress) return null;
  return {
    destinationAddress: user.savedWithdrawAddress,
    chainId: user.savedWithdrawChainId,
    tokenSymbol: user.savedWithdrawToken,
  };
}

export async function saveWithdrawWallet(
  userId,
  { destinationAddress, chainId, tokenSymbol },
  tx = prisma
) {
  const trimmed = String(destinationAddress || '').trim();
  if (!ethers.isAddress(trimmed)) {
    throw new Error('Invalid wallet address');
  }

  const normalized = ethers.getAddress(trimmed);
  const data = {
    savedWithdrawAddress: normalized,
    savedWithdrawChainId: chainId ? parseInt(chainId, 10) : null,
    savedWithdrawToken: tokenSymbol ? String(tokenSymbol).toUpperCase() : null,
  };

  await tx.user.update({ where: { id: userId }, data });

  return {
    destinationAddress: normalized,
    chainId: data.savedWithdrawChainId,
    tokenSymbol: data.savedWithdrawToken,
  };
}

async function persistWithdrawWallet(userId, { destinationAddress, chainId, tokenSymbol }, tx) {
  await saveWithdrawWallet(userId, { destinationAddress, chainId, tokenSymbol }, tx);
}

async function getWithdrawalLedgerNet(withdrawalId, userId, tx = prisma) {
  const entries = await tx.balanceEntry.findMany({
    where: {
      userId,
      sourceType: 'WITHDRAWAL',
      OR: [{ sourceId: withdrawalId }, { sourceId: { startsWith: `${withdrawalId}:` } }],
    },
  });

  let netDebited = 0;
  for (const entry of entries) {
    const amt = parseFloat(entry.amountUsd) || 0;
    if (entry.type === 'DEBIT') netDebited += amt;
    else netDebited -= amt;
  }
  return { netDebited, entries };
}

async function refundWithdrawal(withdrawal, tx = prisma) {
  const { netDebited } = await getWithdrawalLedgerNet(withdrawal.id, withdrawal.userId, tx);
  if (netDebited <= 0.00000001) return;

  await tx.balanceEntry.create({
    data: {
      userId: withdrawal.userId,
      type: 'CREDIT',
      amountUsd: netDebited.toFixed(2),
      sourceType: 'WITHDRAWAL',
      sourceId: `${withdrawal.id}:refund:${Date.now()}`,
    },
  });
}

/** Repair FAILED/CANCELLED withdrawals that were re-debited on retry but never re-refunded */
export async function repairMissingWithdrawalRefunds(tx = prisma) {
  const stuck = await tx.withdrawal.findMany({
    where: { status: { in: ['FAILED', 'CANCELLED'] } },
  });
  let repaired = 0;
  for (const withdrawal of stuck) {
    const { netDebited } = await getWithdrawalLedgerNet(withdrawal.id, withdrawal.userId, tx);
    if (netDebited <= 0.00000001) continue;
    await refundWithdrawal(withdrawal, tx);
    repaired += 1;
    console.log(
      `Repaired withdrawal refund ${withdrawal.id}: restored $${netDebited.toFixed(2)}`
    );
  }
  return repaired;
}

export async function cancelWithdrawal(withdrawalId, { reason } = {}) {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  if (!withdrawal) {
    const err = new Error('Withdrawal not found');
    err.status = 404;
    throw err;
  }
  if (withdrawal.status !== 'PENDING') {
    const err = new Error('Only queued (PENDING) withdrawals can be cancelled');
    err.status = 400;
    throw err;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await refundWithdrawal(withdrawal, tx);
    return tx.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'CANCELLED',
        failureReason: (reason || 'Cancelled by admin').slice(0, 500),
        processedAt: new Date(),
      },
    });
  });

  return formatWithdrawal(updated);
}

export async function retryWithdrawal(withdrawalId) {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  if (!withdrawal) {
    const err = new Error('Withdrawal not found');
    err.status = 404;
    throw err;
  }
  if (withdrawal.status !== 'FAILED' && withdrawal.status !== 'CANCELLED') {
    const err = new Error('Only failed or cancelled withdrawals can be retried');
    err.status = 400;
    throw err;
  }

  const amountNum = parseFloat(withdrawal.amountUsd) || 0;
  const retrySourceId = `${withdrawal.id}:retry`;

  const updated = await prisma.$transaction(async (tx) => {
    const existingRetryDebit = await tx.balanceEntry.findUnique({
      where: {
        sourceType_sourceId: { sourceType: 'WITHDRAWAL', sourceId: retrySourceId },
      },
    });

    if (!existingRetryDebit) {
      const balance = await getUserBalanceSummary(withdrawal.userId, tx);
      if (parseFloat(balance.availableUsd) < amountNum) {
        throw Object.assign(
          new Error(`Insufficient balance to retry. Available: $${balance.availableUsd}`),
          { status: 400 }
        );
      }
      await tx.balanceEntry.create({
        data: {
          userId: withdrawal.userId,
          type: 'DEBIT',
          amountUsd: amountNum.toFixed(2),
          sourceType: 'WITHDRAWAL',
          sourceId: retrySourceId,
        },
      });
    }

    return tx.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'PENDING',
        failureReason: null,
        txHash: null,
        processedAt: null,
      },
    });
  });

  return formatWithdrawal(updated);
}

export async function processWithdrawalById(withdrawalId) {
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  if (!withdrawal) {
    const err = new Error('Withdrawal not found');
    err.status = 404;
    throw err;
  }
  if (withdrawal.status !== 'PENDING') {
    const err = new Error('Only PENDING withdrawals can be processed');
    err.status = 400;
    throw err;
  }

  try {
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: 'PROCESSING' },
    });

    const send = await sendFromPayoutWallet(
      withdrawal.destinationAddress,
      withdrawal.chainId,
      withdrawal.tokenSymbol,
      withdrawal.tokenAmount
    );

    const updated = await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'COMPLETED',
        txHash: send.txHash,
        processedAt: new Date(),
        failureReason: null,
      },
    });

    notifyTreasuryChanged();
    return { success: true, withdrawal: formatWithdrawal(updated) };
  } catch (err) {
    await prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'FAILED',
          failureReason: sanitizeWithdrawFailure(err),
          processedAt: new Date(),
        },
      });
      await refundWithdrawal(withdrawal, tx);
    });
    return { success: false, error: sanitizeWithdrawFailure(err), withdrawal: formatWithdrawal(await prisma.withdrawal.findUnique({ where: { id: withdrawalId } })) };
  }
}

export async function listWithdrawalsForAdmin({ status, limit = 100 } = {}) {
  const where = {};
  if (status && status !== 'all') {
    where.status = status;
  }

  const take = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 300);
  const [rows, counts] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, email: true, phone: true, username: true, name: true } },
      },
    }),
    prisma.withdrawal.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const statusCounts = {
    PENDING: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
    CANCELLED: 0,
  };
  for (const row of counts) {
    statusCounts[row.status] = row._count._all;
  }

  return {
    withdrawals: rows.map((w) => ({
      ...formatWithdrawal(w),
      userLabel: w.user?.username || w.user?.email || w.user?.phone || w.user?.name || w.userId.slice(0, 8),
      userId: w.userId,
    })),
    statusCounts,
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
  };
}

export async function processPendingWithdrawals() {
  const pending = await prisma.withdrawal.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });

  const results = [];

  for (const withdrawal of pending) {
    try {
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'PROCESSING' },
      });

      const send = await sendFromPayoutWallet(
        withdrawal.destinationAddress,
        withdrawal.chainId,
        withdrawal.tokenSymbol,
        withdrawal.tokenAmount
      );

      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'COMPLETED',
          txHash: send.txHash,
          processedAt: new Date(),
          failureReason: null,
        },
      });

      console.log(
        `Withdrawal ${withdrawal.id}: sent ${send.amount} ${withdrawal.tokenSymbol} → ${withdrawal.destinationAddress}`
      );

      notifyTreasuryChanged();
      results.push({ id: withdrawal.id, success: true, txHash: send.txHash });
    } catch (err) {
      await prisma.$transaction(async (tx) => {
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: 'FAILED',
            failureReason: sanitizeWithdrawFailure(err),
            processedAt: new Date(),
          },
        });
        await refundWithdrawal(withdrawal, tx);
      });

      console.error(`Withdrawal ${withdrawal.id} failed:`, err.logMessage || err.message);
      results.push({ id: withdrawal.id, success: false, error: err.message });
    }
  }

  return results;
}

export function startWithdrawalProcessor(intervalMs = config.withdrawPollIntervalMs) {
  console.log(`Withdrawal processor started (every ${intervalMs}ms)`);
  console.log(`Payout wallet: ${getPayoutAddress()}`);

  const run = async () => {
    try {
      await processPendingWithdrawals();
    } catch (err) {
      console.error('Withdrawal processor error:', err.message);
    }
  };

  run();
  return setInterval(run, intervalMs);
}

export { formatWithdrawal };
