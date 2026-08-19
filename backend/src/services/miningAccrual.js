import { prisma } from '../db.js';

// Mining yield stays on MiningIncome / MiningPosition.totalEarned only.
// Never credit Available USD — mining cannot be withdrawn.

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

export function usesHourSession(optionOrHours) {
  if (optionOrHours == null) return false;
  if (typeof optionOrHours === 'object') {
    return optionOrHours.sessionHours != null && optionOrHours.sessionHours > 0;
  }
  return optionOrHours > 0;
}

export function computeMiningEndsAt(startedAt, option) {
  const start = new Date(startedAt);
  if (usesHourSession(option)) {
    return new Date(start.getTime() + option.sessionHours * 60 * 60 * 1000);
  }
  const endsAt = new Date(start);
  endsAt.setUTCDate(endsAt.getUTCDate() + option.durationDays);
  return endsAt;
}

async function accrueSessionIncome(position, accrualDate) {
  const incomeAmount = calcDailyIncome(position.amount, position.option.dailyRate);
  const incomeNum = parseFloat(incomeAmount);
  if (incomeNum <= 0) return false;

  const existing = await prisma.miningIncome.findUnique({
    where: {
      positionId_accrualDate: {
        positionId: position.id,
        accrualDate,
      },
    },
  });
  if (existing) return false;

  const prevEarned = parseFloat(position.totalEarned || '0');
  await prisma.$transaction(async (tx) => {
    await tx.miningIncome.create({
      data: {
        userId: position.userId,
        positionId: position.id,
        amount: incomeAmount,
        tokenSymbol: position.tokenSymbol,
        accrualDate,
      },
    });

    await tx.miningPosition.update({
      where: { id: position.id },
      data: {
        totalEarned: (prevEarned + incomeNum).toFixed(8),
        lastAccruedAt: accrualDate,
      },
    });
  });

  position.totalEarned = (prevEarned + incomeNum).toFixed(8);
  position.lastAccruedAt = accrualDate;
  return true;
}

async function completeHourSession(position) {
  const accrualDate = startOfUtcDay(position.startedAt);
  if (!position.lastAccruedAt) {
    await accrueSessionIncome(position, accrualDate);
  }
  await prisma.miningPosition.update({
    where: { id: position.id },
    data: { status: 'COMPLETED' },
  });
}

export async function accrueMiningDailyIncome() {
  const today = startOfUtcDay(new Date());
  const now = new Date();
  const active = await prisma.miningPosition.findMany({
    where: { status: 'ACTIVE' },
    include: { option: true },
  });

  let accrued = 0;

  for (const position of active) {
    const hourSession = usesHourSession(position.sessionHours ?? position.option);

    if (hourSession) {
      if (now >= position.endsAt) {
        await completeHourSession(position);
      }
      continue;
    }

    if (now >= position.endsAt) {
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

export function endsAtFromStart(startedAt, durationDays) {
  const endsAt = new Date(startedAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + Number(durationDays));
  return endsAt;
}

export function endsAtFromSession(startedAt, sessionHours) {
  return new Date(new Date(startedAt).getTime() + Number(sessionHours) * 60 * 60 * 1000);
}

export async function applyActiveMiningTerms(optionId, { durationDays, sessionHours } = {}) {
  const positions = await prisma.miningPosition.findMany({
    where: { optionId, status: 'ACTIVE' },
    select: { id: true, startedAt: true, sessionHours: true },
  });

  if (!positions.length) return { updated: 0, completed: 0 };

  const now = new Date();
  let updated = 0;
  let completed = 0;

  for (const pos of positions) {
    let endsAt;
    const hours = sessionHours ?? pos.sessionHours;

    if (hours != null && hours > 0) {
      endsAt = endsAtFromSession(pos.startedAt, hours);
    } else if (durationDays != null) {
      const days = parseInt(durationDays, 10);
      if (!Number.isFinite(days) || days < 1) continue;
      endsAt = endsAtFromStart(pos.startedAt, days);
    } else {
      continue;
    }

    if (now >= endsAt) {
      await prisma.miningPosition.update({
        where: { id: pos.id },
        data: { endsAt, status: 'COMPLETED' },
      });
      completed += 1;
    } else {
      await prisma.miningPosition.update({
        where: { id: pos.id },
        data: { endsAt },
      });
      updated += 1;
    }
  }

  return { updated, completed };
}
