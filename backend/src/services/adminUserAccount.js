import { prisma } from '../db.js';
import { getNetwork } from '../config/networks.js';
import { getUserBalanceSummary } from './userBalance.js';

function transferIdFromSource(sourceId) {
  if (!sourceId) return null;
  const idx = sourceId.lastIndexOf(':');
  if (idx === -1) return sourceId;
  return sourceId.slice(0, idx);
}

function withdrawalIdFromSource(sourceId) {
  if (!sourceId) return null;
  const idx = String(sourceId).indexOf(':');
  return idx === -1 ? sourceId : sourceId.slice(0, idx);
}

function isWithdrawalRefundSource(sourceId) {
  return /:refund(?::|$)/.test(String(sourceId || ''));
}

function userHandle(u) {
  if (!u) return null;
  return u.username || u.email || u.phone || u.name || u.id?.slice(0, 8);
}

async function enrichLedger(entries) {
  const byType = {
    PAYMENT: [],
    PACKAGE_INVESTMENT: [],
    PACKAGE_INCOME: [],
    MINING_PURCHASE: [],
    USER_TRANSFER: [],
    WITHDRAWAL: [],
    REFERRAL: [],
    LOAN: [],
  };

  for (const e of entries) {
    if (byType[e.sourceType]) byType[e.sourceType].push(e.sourceId);
  }

  const transferIds = [
    ...new Set(byType.USER_TRANSFER.map(transferIdFromSource).filter(Boolean)),
  ];
  const withdrawalIds = [
    ...new Set(byType.WITHDRAWAL.map(withdrawalIdFromSource).filter(Boolean)),
  ];

  const [
    payments,
    investments,
    packageIncomes,
    miningPositions,
    transfers,
    withdrawals,
    commissions,
    loans,
  ] = await Promise.all([
    byType.PAYMENT.length
      ? prisma.payment.findMany({
          where: { id: { in: byType.PAYMENT } },
          select: {
            id: true,
            amount: true,
            paidAmount: true,
            tokenSymbol: true,
            chainId: true,
            status: true,
            txHash: true,
          },
        })
      : [],
    byType.PACKAGE_INVESTMENT.length
      ? prisma.packageInvestment.findMany({
          where: { id: { in: byType.PACKAGE_INVESTMENT } },
          select: {
            id: true,
            amount: true,
            status: true,
            package: { select: { name: true } },
          },
        })
      : [],
    byType.PACKAGE_INCOME.length
      ? prisma.packageIncome.findMany({
          where: { id: { in: byType.PACKAGE_INCOME } },
          select: {
            id: true,
            amount: true,
            accrualDate: true,
            loanRepaymentUsd: true,
            investment: { select: { package: { select: { name: true } } } },
          },
        })
      : [],
    byType.MINING_PURCHASE.length
      ? prisma.miningPosition.findMany({
          where: { id: { in: byType.MINING_PURCHASE } },
          select: {
            id: true,
            amount: true,
            status: true,
            option: { select: { name: true, coin: true } },
          },
        })
      : [],
    transferIds.length
      ? prisma.userTransfer.findMany({
          where: { id: { in: transferIds } },
          select: {
            id: true,
            amountUsd: true,
            note: true,
            fromUser: { select: { id: true, username: true, email: true, phone: true, name: true } },
            toUser: { select: { id: true, username: true, email: true, phone: true, name: true } },
          },
        })
      : [],
    withdrawalIds.length
      ? prisma.withdrawal.findMany({
          where: { id: { in: withdrawalIds } },
          select: {
            id: true,
            amountUsd: true,
            tokenSymbol: true,
            tokenAmount: true,
            chainId: true,
            destinationAddress: true,
            status: true,
            txHash: true,
          },
        })
      : [],
    byType.REFERRAL.length
      ? prisma.referralCommission.findMany({
          where: { id: { in: byType.REFERRAL } },
          select: {
            id: true,
            commissionUsd: true,
            invitee: { select: { id: true, username: true, email: true, phone: true, name: true } },
          },
        })
      : [],
    byType.LOAN.length
      ? prisma.loan.findMany({
          where: { id: { in: byType.LOAN } },
          select: {
            id: true,
            principalUsd: true,
            totalOwedUsd: true,
            paidUsd: true,
            status: true,
          },
        })
      : [],
  ]);

  const paymentMap = Object.fromEntries(payments.map((p) => [p.id, p]));
  const investmentMap = Object.fromEntries(investments.map((p) => [p.id, p]));
  const incomeMap = Object.fromEntries(packageIncomes.map((p) => [p.id, p]));
  const miningMap = Object.fromEntries(miningPositions.map((p) => [p.id, p]));
  const transferMap = Object.fromEntries(transfers.map((p) => [p.id, p]));
  const withdrawalMap = Object.fromEntries(withdrawals.map((p) => [p.id, p]));
  const referralMap = Object.fromEntries(commissions.map((p) => [p.id, p]));
  const loanMap = Object.fromEntries(loans.map((p) => [p.id, p]));

  return entries.map((entry) => {
    let label = entry.sourceType.replace(/_/g, ' ').toLowerCase();
    let detail = null;
    let meta = null;

    switch (entry.sourceType) {
      case 'PAYMENT': {
        const p = paymentMap[entry.sourceId];
        if (p) {
          label = 'Deposit';
          detail = `${p.paidAmount || p.amount} ${p.tokenSymbol} · ${p.status}`;
          meta = {
            networkName: getNetwork(p.chainId)?.name || `Chain ${p.chainId}`,
            txHash: p.txHash,
            status: p.status,
          };
        }
        break;
      }
      case 'PACKAGE_INVESTMENT': {
        const inv = investmentMap[entry.sourceId];
        if (inv) {
          label = 'Package purchase';
          detail = `${inv.package?.name || 'Package'} · $${inv.amount} · ${inv.status}`;
          meta = { packageName: inv.package?.name, status: inv.status };
        }
        break;
      }
      case 'PACKAGE_INCOME': {
        const inc = incomeMap[entry.sourceId];
        if (inc) {
          label = 'Package income';
          const pkgName = inc.investment?.package?.name || 'Package';
          const repaid = parseFloat(inc.loanRepaymentUsd || '0') || 0;
          detail =
            repaid > 0
              ? `${pkgName} · earned $${inc.amount} · loan repayment $${repaid.toFixed(4)}`
              : `${pkgName} · $${inc.amount}`;
          meta = {
            packageName: pkgName,
            accrualDate: inc.accrualDate,
            loanRepaymentUsd: inc.loanRepaymentUsd,
          };
        }
        break;
      }
      case 'MINING_PURCHASE': {
        const pos = miningMap[entry.sourceId];
        if (pos) {
          label = 'Mining purchase';
          detail = `${pos.option?.name || 'Miner'} · $${pos.amount} · ${pos.status}`;
          meta = { optionName: pos.option?.name, coin: pos.option?.coin, status: pos.status };
        }
        break;
      }
      case 'USER_TRANSFER': {
        const tid = transferIdFromSource(entry.sourceId);
        const tr = transferMap[tid];
        const direction = String(entry.sourceId).endsWith(':credit') ? 'in' : 'out';
        if (tr) {
          label = direction === 'in' ? 'Transfer received' : 'Transfer sent';
          const other = direction === 'in' ? tr.fromUser : tr.toUser;
          detail = `${direction === 'in' ? 'From' : 'To'} ${userHandle(other)}${tr.note ? ` · ${tr.note}` : ''}`;
          meta = { direction, otherUser: userHandle(other), note: tr.note };
        }
        break;
      }
      case 'WITHDRAWAL': {
        const wid = withdrawalIdFromSource(entry.sourceId);
        const w = withdrawalMap[wid];
        const isRefund = isWithdrawalRefundSource(entry.sourceId);
        if (w) {
          label = isRefund ? 'Withdrawal refund' : 'Withdrawal';
          detail = `$${w.amountUsd} → ${w.tokenAmount} ${w.tokenSymbol} · ${w.status}`;
          meta = {
            networkName: getNetwork(w.chainId)?.name || `Chain ${w.chainId}`,
            destinationAddress: w.destinationAddress,
            txHash: w.txHash,
            status: w.status,
            refund: isRefund,
          };
        }
        break;
      }
      case 'REFERRAL': {
        const c = referralMap[entry.sourceId];
        if (c) {
          label = 'Referral commission';
          detail = `From ${userHandle(c.invitee)} · $${c.commissionUsd}`;
          meta = { invitee: userHandle(c.invitee) };
        }
        break;
      }
      case 'LOAN': {
        const loan = loanMap[entry.sourceId];
        if (loan) {
          label = 'Loan disbursement';
          detail = `Principal $${loan.principalUsd} · owed $${loan.totalOwedUsd} · ${loan.status}`;
          meta = {
            principalUsd: loan.principalUsd,
            totalOwedUsd: loan.totalOwedUsd,
            paidUsd: loan.paidUsd,
            status: loan.status,
          };
        }
        break;
      }
      default:
        break;
    }

    return {
      id: entry.id,
      type: entry.type,
      amountUsd: entry.amountUsd,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      createdAt: entry.createdAt,
      label,
      detail,
      meta,
    };
  });
}

export async function getAdminUserAccount(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      blocked: true,
      blockedAt: true,
      blockedReason: true,
      inviteCode: true,
      createdAt: true,
      updatedAt: true,
      referredBy: {
        select: { id: true, username: true, email: true, phone: true, name: true },
      },
      _count: {
        select: {
          payments: true,
          withdrawals: true,
          packageInvestments: true,
          packageIncomes: true,
          miningPositions: true,
          miningIncomes: true,
          balanceEntries: true,
          transfersSent: true,
          transfersReceived: true,
          loans: true,
          referrals: true,
        },
      },
    },
  });

  if (!user) return null;

  const [
    balance,
    entries,
    payments,
    withdrawals,
    packageInvestments,
    packageIncomes,
    miningPositions,
    miningIncomes,
    transfersSent,
    transfersReceived,
    loans,
  ] = await Promise.all([
    getUserBalanceSummary(userId),
    prisma.balanceEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        tokenSymbol: true,
        chainId: true,
        status: true,
        usdAmount: true,
        txHash: true,
        createdAt: true,
      },
    }),
    prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amountUsd: true,
        tokenSymbol: true,
        tokenAmount: true,
        chainId: true,
        destinationAddress: true,
        status: true,
        txHash: true,
        createdAt: true,
      },
    }),
    prisma.packageInvestment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amount: true,
        status: true,
        totalEarned: true,
        startedAt: true,
        endsAt: true,
        createdAt: true,
        package: { select: { name: true, dailyRate: true } },
      },
    }),
    prisma.packageIncome.findMany({
      where: { userId },
      orderBy: { accrualDate: 'desc' },
      take: 100,
      select: {
        id: true,
        amount: true,
        accrualDate: true,
        loanRepaymentUsd: true,
        createdAt: true,
        investment: { select: { package: { select: { name: true } } } },
      },
    }),
    prisma.miningPosition.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amount: true,
        status: true,
        totalEarned: true,
        startedAt: true,
        endsAt: true,
        createdAt: true,
        option: { select: { name: true, coin: true, dailyRate: true } },
      },
    }),
    prisma.miningIncome.findMany({
      where: { userId },
      orderBy: { accrualDate: 'desc' },
      take: 100,
      select: {
        id: true,
        amount: true,
        tokenSymbol: true,
        accrualDate: true,
        createdAt: true,
        position: { select: { option: { select: { name: true } } } },
      },
    }),
    prisma.userTransfer.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amountUsd: true,
        note: true,
        createdAt: true,
        toUser: { select: { id: true, username: true, email: true, phone: true, name: true } },
      },
    }),
    prisma.userTransfer.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amountUsd: true,
        note: true,
        createdAt: true,
        fromUser: { select: { id: true, username: true, email: true, phone: true, name: true } },
      },
    }),
    prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        principalUsd: true,
        totalOwedUsd: true,
        paidUsd: true,
        status: true,
        createdAt: true,
        paidAt: true,
      },
    }),
  ]);

  const ledger = await enrichLedger(entries);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      blocked: Boolean(user.blocked),
      blockedAt: user.blockedAt,
      blockedReason: user.blockedReason,
      inviteCode: user.inviteCode,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      referredBy: user.referredBy
        ? {
            id: user.referredBy.id,
            label: userHandle(user.referredBy),
          }
        : null,
      counts: user._count,
    },
    balance,
    ledger,
    payments: payments.map((p) => ({
      ...p,
      networkName: getNetwork(p.chainId)?.name || `Chain ${p.chainId}`,
    })),
    withdrawals: withdrawals.map((w) => ({
      ...w,
      networkName: getNetwork(w.chainId)?.name || `Chain ${w.chainId}`,
      explorer: getNetwork(w.chainId)?.explorer || null,
    })),
    packageInvestments,
    packageIncomes: packageIncomes.map((row) => ({
      id: row.id,
      amount: row.amount,
      accrualDate: row.accrualDate,
      loanRepaymentUsd: row.loanRepaymentUsd,
      createdAt: row.createdAt,
      packageName: row.investment?.package?.name || '—',
    })),
    miningPositions,
    miningIncomes: miningIncomes.map((row) => ({
      id: row.id,
      amount: row.amount,
      tokenSymbol: row.tokenSymbol,
      accrualDate: row.accrualDate,
      createdAt: row.createdAt,
      optionName: row.position?.option?.name || '—',
    })),
    transfersSent: transfersSent.map((t) => ({
      id: t.id,
      amountUsd: t.amountUsd,
      note: t.note,
      createdAt: t.createdAt,
      to: userHandle(t.toUser),
      toUserId: t.toUser?.id,
    })),
    transfersReceived: transfersReceived.map((t) => ({
      id: t.id,
      amountUsd: t.amountUsd,
      note: t.note,
      createdAt: t.createdAt,
      from: userHandle(t.fromUser),
      fromUserId: t.fromUser?.id,
    })),
    loans,
  };
}
