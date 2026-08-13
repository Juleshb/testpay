import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { sweepPayment } from './wallet.js';
import { creditPaymentBalance } from './userBalance.js';

export async function sweepConfirmedPayments() {
  const confirmed = await prisma.payment.findMany({
    where: { status: 'CONFIRMED' },
  });

  const results = [];

  for (const payment of confirmed) {
    try {
      const sweep = await sweepPayment(payment, config.treasuryAddress);

      if (sweep) {
        const updated = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SWEPT',
            sweptAt: new Date(),
            sweepTxHash: sweep.txHash,
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
