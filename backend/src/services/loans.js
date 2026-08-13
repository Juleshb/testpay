import { prisma } from '../db.js';
import { getUserBalanceSummary } from './userBalance.js';

export const LOAN_PRINCIPAL_PERCENT = 75;
export const LOAN_INTEREST_PERCENT = 25;
export const MIN_QUALIFIED_REFERRALS = 3;

function memberLabel(user) {
  if (user?.name) return user.name;
  if (user?.username) return `@${user.username}`;
  return 'User';
}

export async function getActiveInvestmentTotal(userId, tx = prisma) {
  const investments = await tx.packageInvestment.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { amount: true },
  });
  return investments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
}

export async function getQualifiedReferrals(userId, tx = prisma) {
  const referrals = await tx.user.findMany({
    where: { referredById: userId },
    select: {
      id: true,
      username: true,
      name: true,
      createdAt: true,
      _count: { select: { packageInvestments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return referrals.map((r) => ({
    id: r.id,
    username: r.username,
    name: r.name,
    label: memberLabel(r),
    joinedAt: r.createdAt,
    hasPackage: r._count.packageInvestments > 0,
    qualified: r._count.packageInvestments > 0,
  }));
}

export async function getLoanEligibility(userId, tx = prisma) {
  const [investmentCount, activeInvestmentUsd, qualifiedReferrals, activeLoan] = await Promise.all([
    tx.packageInvestment.count({ where: { userId } }),
    getActiveInvestmentTotal(userId, tx),
    getQualifiedReferrals(userId, tx),
    tx.loan.findFirst({ where: { userId, status: 'ACTIVE' } }),
  ]);

  const qualifiedCount = qualifiedReferrals.filter((r) => r.qualified).length;
  const hasAnyPackage = investmentCount > 0;
  const hasActiveInvestment = activeInvestmentUsd > 0;

  const checks = [
    {
      id: 'package',
      label: 'Joined at least one package',
      met: hasAnyPackage,
      detail: hasAnyPackage
        ? `${investmentCount} package investment(s)`
        : 'Invest in a package first',
    },
    {
      id: 'active_investment',
      label: 'Active package investment for loan calculation',
      met: hasActiveInvestment,
      detail: hasActiveInvestment
        ? `$${activeInvestmentUsd.toFixed(2)} active`
        : 'Need an active package to calculate loan amount',
    },
    {
      id: 'referrals',
      label: `At least ${MIN_QUALIFIED_REFERRALS} invitees with a package`,
      met: qualifiedCount >= MIN_QUALIFIED_REFERRALS,
      detail: `${qualifiedCount} of ${MIN_QUALIFIED_REFERRALS} qualified`,
    },
    {
      id: 'no_active_loan',
      label: 'No active loan',
      met: !activeLoan,
      detail: activeLoan ? 'You already have an active loan' : 'Eligible for a new loan',
    },
  ];

  const principalUsd = hasActiveInvestment
    ? ((activeInvestmentUsd * LOAN_PRINCIPAL_PERCENT) / 100).toFixed(2)
    : '0.00';
  const interestUsd = hasActiveInvestment
    ? ((parseFloat(principalUsd) * LOAN_INTEREST_PERCENT) / 100).toFixed(2)
    : '0.00';
  const totalOwedUsd = hasActiveInvestment
    ? (parseFloat(principalUsd) + parseFloat(interestUsd)).toFixed(2)
    : '0.00';

  return {
    eligible: checks.every((c) => c.met),
    checks,
    terms: {
      principalPercent: LOAN_PRINCIPAL_PERCENT,
      interestPercent: LOAN_INTEREST_PERCENT,
      repaymentSource: 'All daily package earnings apply to your loan until it is fully repaid.',
    },
    investmentBaseUsd: activeInvestmentUsd.toFixed(2),
    offer: {
      principalUsd,
      interestUsd,
      totalOwedUsd,
      interestRate: String(LOAN_INTEREST_PERCENT),
    },
    qualifiedReferrals,
    qualifiedReferralCount: qualifiedCount,
    activeLoan: activeLoan ? formatLoan(activeLoan) : null,
  };
}

export async function applyForLoan(userId, acceptTerms, tx = prisma) {
  if (!acceptTerms) {
    throw new Error('You must accept the loan terms to proceed');
  }

  const eligibility = await getLoanEligibility(userId, tx);
  if (!eligibility.eligible) {
    throw new Error('You are not eligible for a loan yet');
  }

  const principalUsd = eligibility.offer.principalUsd;
  const interestUsd = eligibility.offer.interestUsd;
  const totalOwedUsd = eligibility.offer.totalOwedUsd;
  const investmentBaseUsd = eligibility.investmentBaseUsd;

  if (parseFloat(principalUsd) <= 0) {
    throw new Error('Loan amount must be greater than zero');
  }

  const loan = await tx.loan.create({
    data: {
      userId,
      investmentBaseUsd,
      principalUsd,
      interestUsd,
      interestRate: String(LOAN_INTEREST_PERCENT),
      totalOwedUsd,
      termsAcceptedAt: new Date(),
    },
  });

  await tx.balanceEntry.create({
    data: {
      userId,
      type: 'CREDIT',
      amountUsd: principalUsd,
      sourceType: 'LOAN',
      sourceId: loan.id,
    },
  });

  console.log(`Loan disbursed: $${principalUsd} to user ${userId} (total owed $${totalOwedUsd})`);
  return loan;
}

export async function applyLoanRepaymentFromIncome(userId, packageIncomeId, incomeAmountUsd, tx = prisma) {
  const loan = await tx.loan.findFirst({
    where: { userId, status: 'ACTIVE' },
  });
  if (!loan) return null;

  const incomeNum = parseFloat(incomeAmountUsd);
  if (isNaN(incomeNum) || incomeNum <= 0) return null;

  const paid = parseFloat(loan.paidUsd) || 0;
  const owed = parseFloat(loan.totalOwedUsd) || 0;
  const remaining = Math.max(0, owed - paid);
  if (remaining <= 0) return null;

  const repaymentAmount = Math.min(incomeNum, remaining);
  const repaymentStr = repaymentAmount.toFixed(8);
  const newPaid = paid + repaymentAmount;
  const isPaidOff = newPaid >= owed - 0.00000001;

  await tx.packageIncome.update({
    where: { id: packageIncomeId },
    data: { loanRepaymentUsd: repaymentStr },
  });

  await tx.loanRepayment.create({
    data: {
      loanId: loan.id,
      packageIncomeId,
      amountUsd: repaymentStr,
    },
  });

  await tx.loan.update({
    where: { id: loan.id },
    data: {
      paidUsd: newPaid.toFixed(8),
      status: isPaidOff ? 'PAID' : 'ACTIVE',
      paidAt: isPaidOff ? new Date() : null,
    },
  });

  if (isPaidOff) {
    console.log(`Loan ${loan.id} fully repaid by user ${userId}`);
  }

  return { loanId: loan.id, repaymentUsd: repaymentStr, paidOff: isPaidOff };
}

export async function getLoanDashboard(userId) {
  const [eligibility, loans, balance] = await Promise.all([
    getLoanEligibility(userId),
    prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        repayments: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: {
            packageIncome: {
              select: { accrualDate: true, amount: true },
            },
          },
        },
      },
    }),
    getUserBalanceSummary(userId),
  ]);

  return {
    eligibility,
    balance,
    loans: loans.map(formatLoanDetailed),
  };
}

function formatLoan(loan) {
  const paid = parseFloat(loan.paidUsd) || 0;
  const owed = parseFloat(loan.totalOwedUsd) || 0;
  const remaining = Math.max(0, owed - paid);

  return {
    id: loan.id,
    status: loan.status,
    investmentBaseUsd: loan.investmentBaseUsd,
    principalUsd: loan.principalUsd,
    interestRate: loan.interestRate,
    interestUsd: loan.interestUsd,
    totalOwedUsd: loan.totalOwedUsd,
    paidUsd: loan.paidUsd,
    remainingUsd: remaining.toFixed(2),
    progressPercent: owed > 0 ? Math.min(100, (paid / owed) * 100).toFixed(1) : '100',
    disbursedAt: loan.disbursedAt,
    paidAt: loan.paidAt,
    termsAcceptedAt: loan.termsAcceptedAt,
  };
}

function formatLoanDetailed(loan) {
  return {
    ...formatLoan(loan),
    repayments: loan.repayments.map((r) => ({
      id: r.id,
      amountUsd: r.amountUsd,
      createdAt: r.createdAt,
      accrualDate: r.packageIncome.accrualDate,
      incomeAmountUsd: r.packageIncome.amount,
    })),
  };
}
