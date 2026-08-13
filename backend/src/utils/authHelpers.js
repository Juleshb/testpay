import { normalizeUsername } from '../services/username.js';

export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Invalid email address');
  }
  return trimmed;
}

export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  let cleaned = phone.trim().replace(/[\s\-().]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`;
  if (!cleaned.startsWith('+')) cleaned = `+${cleaned.replace(/^0+/, '')}`;
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new Error('Invalid phone number (use 8–15 digits, e.g. +250788123456)');
  }
  return `+${digits}`;
}

export function validateRegistration({ email, phone, password, confirmPassword }) {
  let normalizedEmail = null;
  let normalizedPhone = null;

  try {
    normalizedEmail = email ? normalizeEmail(email) : null;
  } catch (err) {
    return { valid: false, error: err.message };
  }

  try {
    normalizedPhone = phone ? normalizePhone(phone) : null;
  } catch (err) {
    return { valid: false, error: err.message };
  }

  if (!normalizedEmail && !normalizedPhone) {
    return { valid: false, error: 'Email or phone number is required' };
  }

  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }

  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }

  return { valid: true, email: normalizedEmail, phone: normalizedPhone };
}

export async function findUserByIdentifier(prisma, identifier) {
  if (!identifier || typeof identifier !== 'string') return null;
  const trimmed = identifier.trim();

  if (trimmed.includes('@')) {
    try {
      const email = normalizeEmail(trimmed);
      return prisma.user.findUnique({ where: { email } });
    } catch {
      return null;
    }
  }

  try {
    const phone = normalizePhone(trimmed);
    const byPhone = await prisma.user.findUnique({ where: { phone } });
    if (byPhone) return byPhone;
  } catch {
    /* not a phone — try username below */
  }

  try {
    const username = normalizeUsername(trimmed);
    if (username) {
      return prisma.user.findUnique({ where: { username } });
    }
  } catch {
    return null;
  }

  return null;
}

export function formatUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export function userDisplayLabel(user) {
  if (!user) return 'User';
  if (user.username) return `@${user.username}`;
  return user.name || user.email || user.phone || 'User';
}
