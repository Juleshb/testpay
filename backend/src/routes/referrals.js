import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { config } from '../config/index.js';
import {
  getReferralSummary,
  normalizeInviteCode,
  resolveInviterByCode,
} from '../services/referrals.js';

const router = Router();

router.get('/validate/:code', async (req, res) => {
  try {
    const normalized = normalizeInviteCode(req.params.code);
    if (!normalized) {
      return res.status(400).json({ error: 'Invalid invitation code' });
    }

    const inviter = await resolveInviterByCode(normalized);
    if (!inviter) {
      return res.status(404).json({ error: 'Invitation code not found' });
    }

    res.json({
      valid: true,
      inviteCode: inviter.inviteCode,
      inviter: {
        username: inviter.username,
        name: inviter.name,
      },
    });
  } catch (err) {
    console.error('Validate invite error:', err);
    res.status(500).json({ error: 'Failed to validate invitation code' });
  }
});

router.get('/me', authMiddleware(true), async (req, res) => {
  try {
    const summary = await getReferralSummary(req.user.id);
    res.json({
      ...summary,
      inviteLink: `${config.frontendUrl}/register?invite=${summary.inviteCode}`,
    });
  } catch (err) {
    console.error('Referral summary error:', err);
    res.status(500).json({ error: 'Failed to load referral info' });
  }
});

export default router;
