import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { applyForLoan, getLoanDashboard } from '../services/loans.js';

const router = Router();

router.get('/dashboard', authMiddleware(true), async (req, res) => {
  try {
    const data = await getLoanDashboard(req.user.id);
    res.json(data);
  } catch (err) {
    console.error('Loan dashboard error:', err);
    res.status(500).json({ error: 'Failed to load loan dashboard' });
  }
});

router.post('/apply', authMiddleware(true), async (req, res) => {
  try {
    const { acceptTerms } = req.body;
    const loan = await prisma.$transaction(async (tx) => applyForLoan(req.user.id, Boolean(acceptTerms), tx));
    const dashboard = await getLoanDashboard(req.user.id);
    res.status(201).json({
      loan: dashboard.loans.find((l) => l.id === loan.id) || formatLoanFromDb(loan),
      eligibility: dashboard.eligibility,
      balance: dashboard.balance,
    });
  } catch (err) {
    console.error('Loan apply error:', err);
    res.status(400).json({ error: err.message || 'Failed to apply for loan' });
  }
});

function formatLoanFromDb(loan) {
  const paid = parseFloat(loan.paidUsd) || 0;
  const owed = parseFloat(loan.totalOwedUsd) || 0;
  return {
    id: loan.id,
    status: loan.status,
    principalUsd: loan.principalUsd,
    totalOwedUsd: loan.totalOwedUsd,
    paidUsd: loan.paidUsd,
    remainingUsd: Math.max(0, owed - paid).toFixed(2),
  };
}

export default router;
