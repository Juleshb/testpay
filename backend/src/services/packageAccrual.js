import { prisma } from '../db.js';
import { applyLoanRepaymentFromIncome } from './loans.js';

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

export async function accruePackageDailyIncome() {
  const today = startOfUtcDay(new Date());
  const active = await prisma.packageInvestment.findMany({
    where: { status: 'ACTIVE' },
    include: { package: true },
  });

  let accrued = 0;

  for (const investment of active) {
    if (new Date() >= investment.endsAt) {
      await prisma.packageInvestment.update({
        where: { id: investment.id },
        data: { status: 'COMPLETED' },
      });
      continue;
    }

    const firstAccrualDay = addUtcDays(startOfUtcDay(investment.startedAt), 1);
    let cursor = investment.lastAccruedAt
      ? addUtcDays(startOfUtcDay(investment.lastAccruedAt), 1)
      : firstAccrualDay;

    while (cursor <= today) {
      if (cursor >= startOfUtcDay(investment.endsAt)) break;

      const incomeAmount = calcDailyIncome(investment.amount, investment.package.dailyRate);
      const incomeNum = parseFloat(incomeAmount);
      if (incomeNum <= 0) break;

      const existing = await prisma.packageIncome.findUnique({
        where: {
          investmentId_accrualDate: {
            investmentId: investment.id,
            accrualDate: cursor,
          },
        },
      });

      if (!existing) {
        const prevEarned = parseFloat(investment.totalEarned || '0');
        const incomeRecord = await prisma.$transaction(async (tx) => {
          const created = await tx.packageIncome.create({
            data: {
              userId: investment.userId,
              investmentId: investment.id,
              amount: incomeAmount,
              tokenSymbol: investment.tokenSymbol,
              accrualDate: cursor,
            },
          });

          await tx.packageInvestment.update({
            where: { id: investment.id },
            data: {
              totalEarned: (prevEarned + incomeNum).toFixed(8),
              lastAccruedAt: cursor,
            },
          });

          await applyLoanRepaymentFromIncome(
            investment.userId,
            created.id,
            incomeAmount,
            tx
          );

          return created;
        });

        investment.totalEarned = (prevEarned + incomeNum).toFixed(8);
        investment.lastAccruedAt = cursor;
        accrued += 1;
        void incomeRecord;
      }

      cursor = addUtcDays(cursor, 1);
    }
  }

  if (accrued > 0) {
    console.log(`Package daily income: ${accrued} accrual(s) recorded`);
  }

  return accrued;
}

export function startPackageAccrualScheduler() {
  accruePackageDailyIncome().catch((err) => console.error('Package accrual error:', err));
  setInterval(() => {
    accruePackageDailyIncome().catch((err) => console.error('Package accrual error:', err));
  }, 60 * 1000);
  console.log('Package income scheduler started (checks every 60s)');
}

export { calcDailyIncome };
