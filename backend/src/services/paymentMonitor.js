import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { getPaymentBalance, getProvider, ethers } from './wallet.js';
import { getToken, isNativeToken } from '../config/networks.js';
import { creditPaymentBalance } from './userBalance.js';
import { tryActivateDeveloperAccess } from './developerAccess.js';

export async function checkPendingPayments() {
  const pending = await prisma.payment.findMany({
    where: { status: 'PENDING' },
  });

  for (const payment of pending) {
    await checkPayment(payment);
  }
}

async function checkPayment(payment) {
  try {
    const balance = await getPaymentBalance(
      payment.depositAddress,
      payment.chainId,
      payment.tokenSymbol
    );
    const balanceNum = parseFloat(balance);
    const requiredNum = parseFloat(payment.amount);

    if (balanceNum >= requiredNum) {
      let txHash = payment.txHash;
      if (!txHash) {
        try {
          txHash = await findIncomingTx(payment);
        } catch (err) {
          console.warn(`Tx lookup skipped for ${payment.id}:`, err.message);
        }
      }

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CONFIRMED',
          paidAmount: balance,
          txHash: txHash || undefined,
          paidAt: new Date(),
        },
      });

      try {
        await creditPaymentBalance(updated);
      } catch (err) {
        console.error(`Balance credit failed for payment ${payment.id}:`, err.message);
      }

      try {
        await tryActivateDeveloperAccess(updated);
      } catch (err) {
        console.error(`Developer access activation failed for payment ${payment.id}:`, err.message);
      }

      console.log(
        `Payment confirmed: ${payment.id} - ${balance} ${payment.tokenSymbol} on chain ${payment.chainId}`
      );
    }
  } catch (err) {
    console.error(`Error checking payment ${payment.id}:`, err.message);
  }
}

async function findIncomingTx(payment) {
  const token = getToken(payment.chainId, payment.tokenSymbol);
  const provider = getProvider(payment.chainId);
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 5000);
  const address = payment.depositAddress.toLowerCase();

  if (!isNativeToken(token)) {
    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    const paddedTo = ethers.zeroPadValue(payment.depositAddress, 32);
    const logs = await provider.getLogs({
      address: token.address,
      topics: [transferTopic, null, paddedTo],
      fromBlock,
      toBlock: currentBlock,
    });
    if (logs.length > 0) {
      return logs[logs.length - 1].transactionHash;
    }
  }

  return null;
}

export function startPaymentMonitor() {
  console.log(`Payment monitor started (every ${config.pollIntervalMs}ms)`);

  const run = async () => {
    try {
      await checkPendingPayments();
    } catch (err) {
      console.error('Payment monitor error:', err.message);
    }
  };

  run();
  return setInterval(run, config.pollIntervalMs);
}

export async function getPaymentStatus(paymentId) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;

  let liveBalance = '0';
  try {
    liveBalance = await getPaymentBalance(
      payment.depositAddress,
      payment.chainId,
      payment.tokenSymbol
    );
  } catch {
    liveBalance = '0';
  }

  return {
    ...payment,
    liveBalance,
    isPaid: payment.status === 'CONFIRMED' || payment.status === 'SWEPT',
  };
}
