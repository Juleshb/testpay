import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { generateUniqueUsername } from './username.js';

export async function bootstrapAdmin() {
  const { adminEmail, adminPassword } = config;
  if (!adminEmail || !adminPassword) {
    console.log('Admin bootstrap skipped (set ADMIN_EMAIL and ADMIN_PASSWORD in .env)');
    return;
  }

  const email = adminEmail.toLowerCase();
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      username: await generateUniqueUsername(),
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
    },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
  });

  if (!admin.username) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { username: await generateUniqueUsername() },
    });
  }

  console.log(`Admin ready: ${admin.email}`);
}
