import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { signToken, authMiddleware, userSelect } from '../middleware/auth.js';
import { normalizeAvatarUrl, withAvatar } from '../services/avatar.js';
import {
  validateRegistration,
  findUserByIdentifier,
  formatUserResponse,
  normalizeEmail,
  normalizePhone,
} from '../utils/authHelpers.js';
import { generateUniqueUsername, assignUsernameIfMissing } from '../services/username.js';
import {
  assignInviteCodeIfMissing,
  generateUniqueInviteCode,
  resolveInviterByCode,
} from '../services/referrals.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, confirmPassword, name, invitationCode, inviteCode, acceptedTerms } = req.body;
    const rawInvite = invitationCode || inviteCode;

    if (!acceptedTerms) {
      return res.status(400).json({ error: 'You must accept the Terms of Use and Privacy Policy' });
    }

    const validation = validateRegistration({ email, phone, password, confirmPassword });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (validation.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: validation.email } });
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    if (validation.phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: validation.phone } });
      if (existingPhone) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const username = await generateUniqueUsername();
    const userInviteCode = await generateUniqueInviteCode();

    let referredById = null;
    if (rawInvite) {
      const inviter = await resolveInviterByCode(rawInvite);
      if (!inviter) {
        return res.status(400).json({ error: 'Invalid invitation code' });
      }
      referredById = inviter.id;
    }

    const user = await prisma.user.create({
      data: {
        username,
        inviteCode: userInviteCode,
        referredById,
        email: validation.email,
        phone: validation.phone,
        passwordHash,
        name: name?.trim() || null,
      },
      select: userSelect,
    });

    const token = signToken(user.id);
    res.status(201).json({ user: withAvatar(user), token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Email or phone and password are required' });
    }

    const user = await findUserByIdentifier(prisma, loginId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username, email, phone, or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username, email, phone, or password' });
    }

    const token = signToken(user.id);
    res.json({
      user: withAvatar(formatUserResponse(user)),
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/me', authMiddleware(true), async (req, res) => {
  let user = req.user;
  if (!user.username) {
    const username = await assignUsernameIfMissing(user.id);
    user = { ...user, username };
  }
  if (!user.inviteCode) {
    const inviteCode = await assignInviteCodeIfMissing(user.id);
    user = { ...user, inviteCode };
  }
  res.json({ user: withAvatar(user) });
});

router.patch('/me', authMiddleware(true), async (req, res) => {
  try {
    const { name, email, phone, avatarUrl } = req.body;
    const data = {};

    if (name !== undefined) data.name = name?.trim() || null;

    if (avatarUrl !== undefined) {
      data.avatarUrl = normalizeAvatarUrl(avatarUrl);
    }

    if (email !== undefined) {
      if (!email) {
        const current = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!current?.phone) {
          return res.status(400).json({ error: 'Cannot remove email without a phone number on file' });
        }
        data.email = null;
      } else {
        const normalized = normalizeEmail(email);
        const taken = await prisma.user.findFirst({
          where: { email: normalized, id: { not: req.user.id } },
        });
        if (taken) return res.status(409).json({ error: 'Email already in use' });
        data.email = normalized;
      }
    }

    if (phone !== undefined) {
      if (!phone) {
        const current = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!current?.email) {
          return res.status(400).json({ error: 'Cannot remove phone without an email on file' });
        }
        data.phone = null;
      } else {
        const normalized = normalizePhone(phone);
        const taken = await prisma.user.findFirst({
          where: { phone: normalized, id: { not: req.user.id } },
        });
        if (taken) return res.status(409).json({ error: 'Phone number already in use' });
        data.phone = normalized;
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: userSelect,
    });

    res.json({ user: withAvatar(user) });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(400).json({ error: err.message || 'Failed to update profile' });
  }
});

export default router;
