import { Router } from 'express';
import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { sweepConfirmedPayments } from '../services/sweep.js';
import { getNetwork, getNetworksList } from '../config/networks.js';
import { getDepositAddress } from '../services/wallet.js';
import { formatPackage, validatePackageInput } from '../services/bootstrapPackages.js';
import {
  getReferralSettings,
  updateReferralSettings,
} from '../services/referrals.js';
import {
  listAllShowcaseTeam,
  createShowcaseMember,
  updateShowcaseMember,
  deleteShowcaseMember,
} from '../services/showcaseTeam.js';
import {
  listAllTestimonials,
  createShowcaseTestimonial,
  updateShowcaseTestimonial,
  deleteShowcaseTestimonial,
} from '../services/showcaseTestimonials.js';

const router = Router();
const startedAt = new Date();

router.use(authMiddleware(true));
router.use(adminMiddleware());

router.get('/dashboard', async (_req, res) => {
  try {
    const [
      userCount,
      adminCount,
      paymentCount,
      pending,
      confirmed,
      swept,
      expired,
      allPayments,
      walletIndex,
      recentPayments,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'CONFIRMED' } }),
      prisma.payment.count({ where: { status: 'SWEPT' } }),
      prisma.payment.count({ where: { status: 'EXPIRED' } }),
      prisma.payment.findMany({
        select: {
          chainId: true,
          tokenSymbol: true,
          status: true,
          amount: true,
          paidAmount: true,
          createdAt: true,
        },
      }),
      prisma.walletIndex.findUnique({ where: { id: 1 } }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { user: { select: { email: true, phone: true, name: true } } },
      }),
      prisma.user.findMany({
        where: { role: 'USER' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          createdAt: true,
          _count: { select: { payments: true } },
        },
      }),
    ]);

    const byNetwork = {};
    const byToken = {};
    const byStatus = { PENDING: 0, CONFIRMED: 0, SWEPT: 0, EXPIRED: 0 };
    let totalVolume = 0;
    let confirmedVolume = 0;

    for (const p of allPayments) {
      const netName = getNetwork(p.chainId)?.name || `Chain ${p.chainId}`;
      byNetwork[netName] = (byNetwork[netName] || 0) + 1;
      byToken[p.tokenSymbol] = (byToken[p.tokenSymbol] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;

      const amt = parseFloat(p.paidAmount || p.amount || 0);
      if (!isNaN(amt)) {
        totalVolume += amt;
        if (p.status === 'CONFIRMED' || p.status === 'SWEPT') {
          confirmedVolume += parseFloat(p.paidAmount || p.amount || 0);
        }
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentsToday = allPayments.filter(
      (p) => new Date(p.createdAt) >= today
    ).length;

    res.json({
      overview: {
        users: userCount,
        admins: adminCount,
        payments: paymentCount,
        paymentsToday,
        pending,
        confirmed,
        swept,
        expired,
        successRate:
          paymentCount > 0
            ? Math.round(((confirmed + swept) / paymentCount) * 100)
            : 0,
      },
      volume: {
        totalPaymentRequests: paymentCount,
        approximateVolume: totalVolume.toFixed(6),
        confirmedVolume: confirmedVolume.toFixed(6),
      },
      breakdown: {
        byNetwork: Object.entries(byNetwork)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        byToken: Object.entries(byToken)
          .map(([symbol, count]) => ({ symbol, count }))
          .sort((a, b) => b.count - a.count),
        byStatus: Object.entries(byStatus).map(([status, count]) => ({
          status,
          count,
        })),
      },
      system: {
        treasuryAddress: config.treasuryAddress,
        gasFunderAddress: getDepositAddress(0),
        defaultChainId: config.defaultChainId,
        defaultNetwork: getNetwork(config.defaultChainId)?.name || 'Unknown',
        pollIntervalMs: config.pollIntervalMs,
        sweepIntervalMs: 60000,
        frontendUrl: config.frontendUrl,
        serverStartedAt: startedAt.toISOString(),
        uptimeSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
        walletsGenerated: walletIndex?.index || 0,
        supportedNetworks: getNetworksList().map((n) => ({
          chainId: n.chainId,
          name: n.name,
          nativeSymbol: n.nativeSymbol,
          tokenCount: n.tokens.length,
          explorer: n.explorer,
        })),
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        tokenSymbol: p.tokenSymbol,
        chainId: p.chainId,
        networkName: getNetwork(p.chainId)?.name || `Chain ${p.chainId}`,
        status: p.status,
        depositAddress: p.depositAddress,
        userEmail: p.user?.email || p.user?.phone || '—',
        userName: p.user?.name || '—',
        txHash: p.txHash,
        sweepTxHash: p.sweepTxHash,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        sweptAt: p.sweptAt,
      })),
      users: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        name: u.name,
        paymentCount: u._count.payments,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

router.get('/payments', async (_req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { email: true, phone: true, name: true } } },
    });

    res.json(
      payments.map((p) => ({
        ...p,
        networkName: getNetwork(p.chainId)?.name || `Chain ${p.chainId}`,
        userEmail: p.user?.email || p.user?.phone || '—',
        userName: p.user?.name || '—',
        user: undefined,
      }))
    );
  } catch (err) {
    console.error('Admin payments error:', err);
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { payments: true } },
      },
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        paymentCount: u._count.payments,
      }))
    );
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.get('/packages', async (_req, res) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { investments: true } } },
    });
    res.json(
      packages.map((p) => ({
        ...formatPackage(p),
        investmentCount: p._count.investments,
      }))
    );
  } catch (err) {
    console.error('Admin packages list error:', err);
    res.status(500).json({ error: 'Failed to list packages' });
  }
});

router.post('/packages', async (req, res) => {
  try {
    const { errors, data } = validatePackageInput(req.body);
    if (errors.length) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const existing = await prisma.package.findFirst({
      where: {
        OR: [{ slug: data.slug }, { name: data.name }],
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'A package with this name or slug already exists' });
    }

    const pkg = await prisma.package.create({
      data: {
        ...data,
        active: data.active ?? true,
      },
    });
    res.status(201).json(formatPackage(pkg));
  } catch (err) {
    console.error('Admin create package error:', err);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

router.patch('/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const { errors, data } = validatePackageInput(req.body, true);
    if (errors.length) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await prisma.package.findFirst({ where: { slug: data.slug, NOT: { id } } });
      if (slugTaken) return res.status(409).json({ error: 'Slug already in use' });
    }
    if (data.name && data.name !== existing.name) {
      const nameTaken = await prisma.package.findFirst({ where: { name: data.name, NOT: { id } } });
      if (nameTaken) return res.status(409).json({ error: 'Name already in use' });
    }

    const pkg = await prisma.package.update({
      where: { id },
      data,
    });
    res.json(formatPackage(pkg));
  } catch (err) {
    console.error('Admin update package error:', err);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

router.post('/sweep', async (_req, res) => {
  try {
    const results = await Promise.race([
      sweepConfirmedPayments(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sweep timed out')), 25000)
      ),
    ]);
    res.json({ swept: results });
  } catch (err) {
    res.status(504).json({ error: err.message || 'Sweep failed' });
  }
});

router.get('/referrals/settings', async (_req, res) => {
  try {
    const settings = await getReferralSettings();
    const [totalCommissions, commissionRows, referralSignups] = await Promise.all([
      prisma.referralCommission.count(),
      prisma.referralCommission.findMany({ select: { commissionUsd: true } }),
      prisma.user.count({ where: { referredById: { not: null } } }),
    ]);

    const totalPaidUsd = commissionRows
      .reduce((sum, row) => sum + (parseFloat(row.commissionUsd) || 0), 0)
      .toFixed(2);

    res.json({
      commissionPercent: settings.commissionPercent,
      stats: {
        totalCommissions,
        totalPaidUsd,
        referralSignups,
      },
    });
  } catch (err) {
    console.error('Admin referral settings get error:', err);
    res.status(500).json({ error: 'Failed to load referral settings' });
  }
});

router.patch('/referrals/settings', async (req, res) => {
  try {
    const { commissionPercent } = req.body;
    if (commissionPercent === undefined || commissionPercent === null) {
      return res.status(400).json({ error: 'commissionPercent is required' });
    }
    const settings = await updateReferralSettings(commissionPercent);
    res.json({ commissionPercent: settings.commissionPercent });
  } catch (err) {
    console.error('Admin referral settings update error:', err);
    res.status(400).json({ error: err.message || 'Failed to update referral settings' });
  }
});

router.get('/referrals/commissions', async (_req, res) => {
  try {
    const rows = await prisma.referralCommission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        inviter: { select: { username: true, name: true, email: true } },
        invitee: { select: { username: true, name: true, email: true } },
      },
    });
    res.json(
      rows.map((r) => ({
        id: r.id,
        commissionUsd: r.commissionUsd,
        commissionPercent: r.commissionPercent,
        packageAmountUsd: r.packageAmountUsd,
        createdAt: r.createdAt,
        inviter: { username: r.inviter.username, name: r.inviter.name },
        invitee: { username: r.invitee.username, name: r.invitee.name },
      }))
    );
  } catch (err) {
    console.error('Admin referral commissions error:', err);
    res.status(500).json({ error: 'Failed to load referral commissions' });
  }
});

router.get('/showcase-team', async (_req, res) => {
  try {
    const members = await listAllShowcaseTeam();
    res.json(members);
  } catch (err) {
    console.error('Admin showcase team list error:', err);
    res.status(500).json({ error: 'Failed to load showcase team' });
  }
});

router.post('/showcase-team', async (req, res) => {
  try {
    const member = await createShowcaseMember(req.body);
    res.status(201).json(member);
  } catch (err) {
    console.error('Admin showcase team create error:', err);
    res.status(400).json({ error: err.message || 'Failed to create team member' });
  }
});

router.patch('/showcase-team/:id', async (req, res) => {
  try {
    const member = await updateShowcaseMember(req.params.id, req.body);
    res.json(member);
  } catch (err) {
    console.error('Admin showcase team update error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Team member not found' });
    }
    res.status(400).json({ error: err.message || 'Failed to update team member' });
  }
});

router.delete('/showcase-team/:id', async (req, res) => {
  try {
    await deleteShowcaseMember(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin showcase team delete error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Team member not found' });
    }
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

router.get('/testimonials', async (_req, res) => {
  try {
    const rows = await listAllTestimonials();
    res.json(rows);
  } catch (err) {
    console.error('Admin testimonials list error:', err);
    res.status(500).json({ error: 'Failed to load testimonials' });
  }
});

router.post('/testimonials', async (req, res) => {
  try {
    const row = await createShowcaseTestimonial(req.body);
    res.status(201).json(row);
  } catch (err) {
    console.error('Admin testimonial create error:', err);
    res.status(400).json({ error: err.message || 'Failed to create testimonial' });
  }
});

router.patch('/testimonials/:id', async (req, res) => {
  try {
    const row = await updateShowcaseTestimonial(req.params.id, req.body);
    res.json(row);
  } catch (err) {
    console.error('Admin testimonial update error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.status(400).json({ error: err.message || 'Failed to update testimonial' });
  }
});

router.delete('/testimonials/:id', async (req, res) => {
  try {
    await deleteShowcaseTestimonial(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin testimonial delete error:', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

export default router;
