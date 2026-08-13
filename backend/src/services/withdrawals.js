import { ethers } from 'ethers';
import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { getNetwork, getToken, isNativeToken, validatePaymentRequest, getNetworksList } from '../config/networks.js';
import { convertUsdToToken, STABLECOINS } from './priceConversion.js';
import { getUserBalanceSummary } from './userBalance.js';
import { sendErc20FromPayoutWallet, getPayoutAddress } from './wallet.js';

const WITHDRAWABLE_TOKENS = ['USDC', 'USDT'];

export function getWithdrawOptions() {
  const networks = getNetworksList()
    .map((network) => ({
      chainId: network.chainId,
      name: network.name,
      explorer: network.explorer,
      tokens: network.tokens
        .filter((t) => WITHDRAWABLE_TOKENS.includes(t.symbol))
        .map((t) => ({ symbol: t.symbol, name: t.name, decimals: t.decimals })),
    }))
    .filter((n) => n.tokens.length > 0);

  return {
    networks,
    minWithdrawUsd: config.minWithdrawUsd,
    maxWithdrawUsd: config.maxWithdrawUsd,
    defaultChainId: config.defaultChainId,
    defaultToken: 'USDC',
    payoutWalletAddress: getPayoutAddress(),
  };
}

function formatWithdrawal(withdrawal) {
  const network = getNetwork(withdrawal.chainId);
  return {
    id: withdrawal.id,
    amountUsd: withdrawal.amountUsd,
    tokenAmount: withdrawal.tokenAmount,
    tokenSymbol: withdrawal.tokenSymbol,
    chainId: withdrawal.chainId,
    networkName: network?.name || `Chain ${withdrawal.chainId}`,
    explorer: network?.explorer || null,
    destinationAddress: withdrawal.destinationAddress,
    status: withdrawal.status,
    txHash: withdrawal.txHash,
    failureReason: withdrawal.failureReason,
    processedAt: withdrawal.processedAt,
    createdAt: withdrawal.createdAt,
  };
}

export async function requestWithdrawal(
  userId,
  { amountUsd, chainId, tokenSymbol, destinationAddress },
  tx = prisma
) {
  const amountNum = parseFloat(amountUsd);
  if (isNaN(amountNum) || amountNum <= 0) throw new Error('Invalid withdrawal amount');
  if (amountNum < config.minWithdrawUsd) {
    throw new Error(`Minimum withdrawal is $${config.minWithdrawUsd.toFixed(2)}`);
  }
  if (amountNum > config.maxWithdrawUsd) {
    throw new Error(`Maximum withdrawal is $${config.maxWithdrawUsd.toFixed(2)}`);
  }

  if (!ethers.isAddress(destinationAddress)) {
    throw new Error('Invalid wallet address');
  }

  const validation = validatePaymentRequest(chainId, tokenSymbol);
  if (!validation.valid) throw new Error(validation.error);

  const token = validation.token;
  if (isNativeToken(token)) throw new Error('Native token withdrawals are not supported yet');
  if (!STABLECOINS.has(tokenSymbol.toUpperCase())) {
    throw new Error('Only USDC and USDT withdrawals are supported');
  }

  const balance = await getUserBalanceSummary(userId, tx);
  if (parseFloat(balance.availableUsd) < amountNum) {
    throw new Error(`Insufficient balance. Available: $${balance.availableUsd} USD`);
  }

  const { tokenAmount } = await convertUsdToToken(amountNum.toFixed(2), tokenSymbol, token.decimals);

  const withdrawal = await tx.withdrawal.create({
    data: {
      userId,
      amountUsd: amountNum.toFixed(2),
      chainId,
      tokenSymbol: tokenSymbol.toUpperCase(),
      tokenAmount,
      tokenAddress: token.address,
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

async function refundWithdrawal(withdrawal, tx = prisma) {
  const existing = await tx.balanceEntry.findUnique({
    where: {
      sourceType_sourceId: { sourceType: 'WITHDRAWAL', sourceId: `${withdrawal.id}:refund` },
    },
  });
  if (existing) return;

  await tx.balanceEntry.create({
    data: {
      userId: withdrawal.userId,
      type: 'CREDIT',
      amountUsd: withdrawal.amountUsd,
      sourceType: 'WITHDRAWAL',
      sourceId: `${withdrawal.id}:refund`,
    },
  });
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

      const send = await sendErc20FromPayoutWallet(
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

      results.push({ id: withdrawal.id, success: true, txHash: send.txHash });
    } catch (err) {
      await prisma.$transaction(async (tx) => {
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: 'FAILED',
            failureReason: err.message?.slice(0, 500) || 'Withdrawal failed',
            processedAt: new Date(),
          },
        });
        await refundWithdrawal(withdrawal, tx);
      });

      console.error(`Withdrawal ${withdrawal.id} failed:`, err.message);
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
