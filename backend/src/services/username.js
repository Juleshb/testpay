import crypto from 'crypto';
import { prisma } from '../db.js';

const ADJECTIVES = [
  'swift', 'bright', 'calm', 'bold', 'keen', 'lucky', 'nova', 'prime', 'rapid', 'solid',
  'alpha', 'beta', 'cyan', 'delta', 'echo', 'flux', 'gold', 'hyper', 'iron', 'jade',
];

const NOUNS = [
  'fox', 'wave', 'star', 'node', 'pay', 'vault', 'mint', 'peer', 'coin', 'link',
  'spark', 'orbit', 'pixel', 'token', 'ledger', 'pulse', 'bridge', 'cipher', 'nexus', 'apex',
];

export function normalizeUsername(input) {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim().toLowerCase().replace(/^@/, '');
  if (!cleaned) return null;
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(cleaned)) {
    throw new Error('Username must be 3–20 characters: letters, numbers, underscore; start with a letter');
  }
  return cleaned;
}

function randomItem(list) {
  return list[crypto.randomInt(0, list.length)];
}

export async function generateUniqueUsername(tx = prisma) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = `${randomItem(ADJECTIVES)}_${randomItem(NOUNS)}${crypto.randomInt(10, 9999)}`;
    const exists = await tx.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }

  return `user_${crypto.randomBytes(4).toString('hex')}`;
}

export async function assignUsernameIfMissing(userId, tx = prisma) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (user?.username) return user.username;

  const username = await generateUniqueUsername(tx);
  await tx.user.update({ where: { id: userId }, data: { username } });
  return username;
}

export async function bootstrapUsernames() {
  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true },
  });

  if (users.length === 0) return;

  for (const user of users) {
    const username = await generateUniqueUsername();
    await prisma.user.update({ where: { id: user.id }, data: { username } });
  }

  console.log(`Usernames assigned to ${users.length} account(s)`);
}
