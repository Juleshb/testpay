import { prisma } from '../db.js';

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function calcDailyIncome(amount, dailyRate) {
  const principal = parseFloat(amount);
  const rate = parseFloat(dailyRate);
  if (isNaN(principal) || isNaN(rate) || principal <= 0) return '0';
  return (principal * (rate / 100)).toFixed(8);
}

export async function accrueMiningDailyIncome() {
  const today = startOfUtcDay(new Date());
  const active = await prisma.miningPosition.findMany({
    where: { status: 'ACTIVE' },
    include: { option: true },
  });

  let accrued = 0;

  for (const position of active) {
    if (new Date() >= position.endsAt) {
      await prisma.miningPosition.update({
        where: { id: position.id },
        data: { status: 'COMPLETED' },
      });
      continue;
    }

    const firstAccrualDay = addUtcDays(startOfUtcDay(position.startedAt), 1);
    let cursor = position.lastAccruedAt
      ? addUtcDays(startOfUtcDay(position.lastAccruedAt), 1)
      : firstAccrualDay;

    while (cursor <= today) {
      if (cursor >= startOfUtcDay(position.endsAt)) break;

      const incomeAmount = calcDailyIncome(position.amount, position.option.dailyRate);
      const incomeNum = parseFloat(incomeAmount);
      if (incomeNum <= 0) break;

      const existing = await prisma.miningIncome.findUnique({
        where: {
          positionId_accrualDate: {
            positionId: position.id,
            accrualDate: cursor,
          },
        },
      });

      if (!existing) {
        const prevEarned = parseFloat(position.totalEarned || '0');
        await prisma.$transaction(async (tx) => {
          await tx.miningIncome.create({
            data: {
              userId: position.userId,
              positionId: position.id,
              amount: incomeAmount,
              tokenSymbol: position.tokenSymbol,
              accrualDate: cursor,
            },
          });

          await tx.miningPosition.update({
            where: { id: position.id },
            data: {
              totalEarned: (prevEarned + incomeNum).toFixed(8),
              lastAccruedAt: cursor,
            },
          });
        });

        position.totalEarned = (prevEarned + incomeNum).toFixed(8);
        position.lastAccruedAt = cursor;
        accrued += 1;
      }

      cursor = addUtcDays(cursor, 1);
    }
  }

  if (accrued > 0) {
    console.log(`Mining daily income: ${accrued} accrual(s) recorded`);
  }

  return accrued;
}

export function startMiningAccrualScheduler() {
  accrueMiningDailyIncome().catch((err) => console.error('Mining accrual error:', err));
  setInterval(() => {
    accrueMiningDailyIncome().catch((err) => console.error('Mining accrual error:', err));
  }, 60 * 1000);
  console.log('Mining income scheduler started (checks every 60s)');
}

export { calcDailyIncome };
