import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../db.js';

const userSelect = {
  id: true,
  username: true,
  inviteCode: true,
  email: true,
  phone: true,
  name: true,
  role: true,
  blocked: true,
  avatarUrl: true,
  createdAt: true,
};

export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' });
}

export function authMiddleware(required = true) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      if (required) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return next();
    }

    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, config.jwtSecret);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: userSelect,
      });

      if (!user) {
        if (required) {
          return res.status(401).json({ error: 'Invalid token' });
        }
        return next();
      }

      if (user.blocked) {
        return res.status(403).json({ error: 'This account has been blocked', code: 'ACCOUNT_BLOCKED' });
      }

      req.user = user;
      next();
    } catch {
      if (required) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      next();
    }
  };
}

export function adminMiddleware() {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };
}

export { userSelect };
