import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { getNetwork } from '../config/networks.js';
import { ethers } from './wallet.js';

function explorerTxUrl(explorer, txHash) {
  if (!explorer || !txHash) return null;
  return `${String(explorer).replace(/\/$/, '')}/tx/${txHash}`;
}

function explorerAddressUrl(explorer, address) {
  if (!explorer || !address) return null;
  return `${String(explorer).replace(/\/$/, '')}/address/${address}`;
}

/**
 * Platform ledger of treasury activity:
 * - IN: sweeps from deposit wallets into TREASURY_ADDRESS
 * - OUT: completed withdrawals paid from treasury (when PAYOUT_USE_TREASURY)
 */
export async function getTreasuryActivity({ limit = 50 } = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const address = ethers.getAddress(config.treasuryAddress);

  const [sweeps, withdrawals] = await Promise.all([
    prisma.payment.findMany({
      where: { status: 'SWEPT', sweepTxHash: { not: null } },
      orderBy: { sweptAt: 'desc' },
      take,
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        usdAmount: true,
        tokenSymbol: true,
        chainId: true,
        depositAddress: true,
        sweepTxHash: true,
        sweptAt: true,
        user: { select: { email: true, phone: true, username: true } },
      },
    }),
    prisma.withdrawal.findMany({
      where: { status: 'COMPLETED', txHash: { not: null } },
      orderBy: { processedAt: 'desc' },
      take,
      select: {
        id: true,
        amountUsd: true,
        feeUsd: true,
        netAmountUsd: true,
        tokenAmount: true,
        tokenSymbol: true,
        chainId: true,
        destinationAddress: true,
        txHash: true,
        processedAt: true,
        user: { select: { email: true, phone: true, username: true } },
      },
    }),
  ]);

  const events = [];

  for (const p of sweeps) {
    const network = getNetwork(p.chainId);
    const amount = p.paidAmount || p.amount;
    events.push({
      id: `sweep:${p.id}`,
      kind: 'IN',
      type: 'SWEEP',
      label: 'Sweep in',
      amount,
      tokenSymbol: p.tokenSymbol,
      amountUsd: p.usdAmount || null,
      chainId: p.chainId,
      networkName: network?.name || `Chain ${p.chainId}`,
      txHash: p.sweepTxHash,
      explorer: network?.explorer || null,
      explorerTxUrl: explorerTxUrl(network?.explorer, p.sweepTxHash),
      counterparty: p.depositAddress,
      userLabel: p.user?.username || p.user?.email || p.user?.phone || null,
      referenceId: p.id,
      referencePath: `/pay/${p.id}`,
      at: p.sweptAt || null,
    });
  }

  for (const w of withdrawals) {
    const network = getNetwork(w.chainId);
    events.push({
      id: `withdraw:${w.id}`,
      kind: 'OUT',
      type: 'WITHDRAWAL',
      label: 'Payout out',
      amount: w.tokenAmount,
      tokenSymbol: w.tokenSymbol,
      amountUsd: w.netAmountUsd || w.amountUsd,
      feeUsd: w.feeUsd || '0',
      chainId: w.chainId,
      networkName: network?.name || `Chain ${w.chainId}`,
      txHash: w.txHash,
      explorer: network?.explorer || null,
      explorerTxUrl: explorerTxUrl(network?.explorer, w.txHash),
      counterparty: w.destinationAddress,
      userLabel: w.user?.username || w.user?.email || w.user?.phone || null,
      referenceId: w.id,
      referencePath: '/admin/withdrawals',
      at: w.processedAt || null,
    });
  }

  events.sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    return tb - ta;
  });

  const sliced = events.slice(0, take);
  const inCount = sliced.filter((e) => e.kind === 'IN').length;
  const outCount = sliced.filter((e) => e.kind === 'OUT').length;

  return {
    address,
    payoutUseTreasury: config.payoutUseTreasury,
    checkedAt: new Date().toISOString(),
    explorerLinks: Object.values(
      Object.fromEntries(
        [...new Set(sliced.map((e) => e.chainId))].map((chainId) => {
          const network = getNetwork(chainId);
          return [
            chainId,
            {
              chainId,
              networkName: network?.name || `Chain ${chainId}`,
              addressUrl: explorerAddressUrl(network?.explorer, address),
            },
          ];
        })
      )
    ),
    summary: {
      shown: sliced.length,
      sweepsIn: inCount,
      payoutsOut: outCount,
    },
    events: sliced,
  };
}
