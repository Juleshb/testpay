import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { sweepPayment, getPaymentBalance } from './wallet.js';
import { creditPaymentBalance } from './userBalance.js';
import { notifyTreasuryChanged } from './treasuryRealtime.js';

export async function sweepConfirmedPayments() {
  const confirmed = await prisma.payment.findMany({
    where: { status: 'CONFIRMED' },
  });

  const results = [];

  for (const payment of confirmed) {
    try {
      // Refresh paid amount in case more arrived after first confirm
      let working = payment;
      try {
        const live = await getPaymentBalance(
          payment.depositAddress,
          payment.chainId,
          payment.tokenSymbol
        );
        const liveNum = parseFloat(live) || 0;
        const paidNum = parseFloat(payment.paidAmount || '0') || 0;
        if (liveNum > paidNum + 1e-12) {
          working = await prisma.payment.update({
            where: { id: payment.id },
            data: { paidAmount: live },
          });
          await creditPaymentBalance(working);
        }
      } catch (err) {
        console.warn(`Pre-sweep balance refresh failed for ${payment.id}:`, err.message);
      }

      const sweep = await sweepPayment(working, config.treasuryAddress);

      if (sweep) {
        const updated = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SWEPT',
            sweptAt: new Date(),
            sweepTxHash: sweep.txHash,
            paidAmount: sweep.amount || working.paidAmount,
          },
        });

        try {
          await creditPaymentBalance(updated);
        } catch (err) {
          console.error(`Balance credit failed after sweep for ${payment.id}:`, err.message);
        }

        results.push({
          paymentId: payment.id,
          success: true,
          txHash: sweep.txHash,
          amount: sweep.amount,
          tokenSymbol: payment.tokenSymbol,
        });

        console.log(
          `Swept ${sweep.amount} ${payment.tokenSymbol} from ${payment.depositAddress} -> ${config.treasuryAddress}`
        );
        notifyTreasuryChanged();
      }
    } catch (err) {
      results.push({
        paymentId: payment.id,
        success: false,
        error: err.message,
      });
      console.error(`Sweep failed for ${payment.id}:`, err.message);
    }
  }

  return results;
}

export function startSweepScheduler(intervalMs = 60000) {
  console.log(`Sweep scheduler started (every ${intervalMs}ms)`);

  const run = async () => {
    try {
      await sweepConfirmedPayments();
    } catch (err) {
      console.error('Sweep scheduler error:', err.message);
    }
  };

  run();
  return setInterval(run, intervalMs);
}
