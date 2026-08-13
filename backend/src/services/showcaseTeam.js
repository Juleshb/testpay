import { prisma } from '../db.js';
import { normalizeAvatarUrl, resolveAvatarUrl } from './avatar.js';

const DEFAULT_TEAM = [
  {
    name: 'Alex Rivera',
    role: 'Community Lead',
    sortOrder: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=256&h=256&fit=crop&crop=face',
  },
  {
    name: 'Jordan Lee',
    role: 'Support Manager',
    sortOrder: 1,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=face',
  },
  {
    name: 'Sam Chen',
    role: 'Growth Lead',
    sortOrder: 2,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=face',
  },
  {
    name: 'Taylor Brooks',
    role: 'Member Success',
    sortOrder: 3,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&h=256&fit=crop&crop=face',
  },
];

export function formatShowcaseMember(member) {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    displayName: member.name,
    avatarUrl: resolveAvatarUrl({
      id: member.id,
      name: member.name,
      avatarUrl: member.avatarUrl,
    }),
    sortOrder: member.sortOrder,
    active: member.active,
  };
}

export async function listActiveShowcaseTeam() {
  const rows = await prisma.showcaseTeamMember.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(formatShowcaseMember);
}

export async function listAllShowcaseTeam() {
  const rows = await prisma.showcaseTeamMember.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(formatShowcaseMember);
}

function validateMemberInput(input, { partial = false } = {}) {
  const payload = {};

  if (!partial || input.name !== undefined) {
    const name = String(input.name || '').trim();
    if (!name) throw new Error('Name is required');
    if (name.length > 80) throw new Error('Name must be 80 characters or less');
    payload.name = name;
  }

  if (!partial || input.role !== undefined) {
    const role = String(input.role || '').trim();
    if (!role) throw new Error('Role is required');
    if (role.length > 80) throw new Error('Role must be 80 characters or less');
    payload.role = role;
  }

  if (input.avatarUrl !== undefined) {
    payload.avatarUrl = normalizeAvatarUrl(input.avatarUrl);
  }

  if (input.sortOrder !== undefined) {
    const sortOrder = Number.parseInt(String(input.sortOrder), 10);
    if (Number.isNaN(sortOrder)) throw new Error('Sort order must be a number');
    payload.sortOrder = sortOrder;
  }

  if (input.active !== undefined) {
    payload.active = Boolean(input.active);
  }

  return payload;
}

export async function createShowcaseMember(input) {
  const data = validateMemberInput(input);
  const member = await prisma.showcaseTeamMember.create({ data });
  return formatShowcaseMember(member);
}

export async function updateShowcaseMember(id, input) {
  const data = validateMemberInput(input, { partial: true });
  if (Object.keys(data).length === 0) {
    throw new Error('No fields to update');
  }
  const member = await prisma.showcaseTeamMember.update({
    where: { id },
    data,
  });
  return formatShowcaseMember(member);
}

export async function deleteShowcaseMember(id) {
  await prisma.showcaseTeamMember.delete({ where: { id } });
}

export async function bootstrapShowcaseTeam() {
  const count = await prisma.showcaseTeamMember.count();
  if (count === 0) {
    await prisma.showcaseTeamMember.createMany({ data: DEFAULT_TEAM });
    console.log(`Showcase team ready (${DEFAULT_TEAM.length} default members)`);
    return;
  }

  const defaultsByName = new Map(DEFAULT_TEAM.map((member) => [member.name, member]));
  const existing = await prisma.showcaseTeamMember.findMany({
    where: { name: { in: [...defaultsByName.keys()] } },
    select: { id: true, name: true, avatarUrl: true },
  });

  let updated = 0;
  for (const member of existing) {
    const defaults = defaultsByName.get(member.name);
    if (!defaults?.avatarUrl || member.avatarUrl) continue;
    await prisma.showcaseTeamMember.update({
      where: { id: member.id },
      data: { avatarUrl: defaults.avatarUrl },
    });
    updated += 1;
  }

  if (updated > 0) {
    console.log(`Showcase team photos updated (${updated} member(s))`);
  }
}
