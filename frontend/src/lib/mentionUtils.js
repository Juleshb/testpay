import { memberLabel } from '../communityApi';

/** Slack-style token stored in message content */
export const MENTION_TOKEN_RE = /<@([a-f0-9-]{36})(?:\|([^>]*))?>/gi;

export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildMentionToken(user) {
  const label = memberLabel(user);
  return `<@${user.id}|${label}>`;
}

/** Convert visible @Name picks to stored tokens before send */
export function serializeMentions(text, members) {
  if (!text || !members?.length) return text;
  let result = text;
  const sorted = [...members].sort(
    (a, b) => memberLabel(b).length - memberLabel(a).length
  );
  for (const member of sorted) {
    const label = memberLabel(member);
    if (!label) continue;
    const re = new RegExp(`@${escapeRegExp(label)}(?=\\s|$|[.,!?;:])`, 'gi');
    result = result.replace(re, buildMentionToken(member));
  }
  return result;
}

/** Parse message into text + mention segments for rendering */
export function parseMentionContent(text) {
  if (!text) return [{ type: 'text', text: '' }];

  const parts = [];
  let lastIndex = 0;
  const re = new RegExp(MENTION_TOKEN_RE.source, 'gi');
  let match;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'mention',
      userId: match[1],
      label: match[2] || null,
    });
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', text }];
}

/** Detect active @mention query at cursor (Slack-style) */
export function getMentionQuery(text, cursorPos) {
  const before = text.slice(0, cursorPos);
  const match = before.match(/(?:^|\s)@([^@\n]*)$/);
  if (!match) return null;

  const query = match[1];
  const atIndex = before.lastIndexOf('@');
  if (atIndex < 0) return null;

  return { query, start: atIndex, end: cursorPos };
}

function compareMemberNames(a, b) {
  return memberLabel(a).localeCompare(memberLabel(b), undefined, { sensitivity: 'base' });
}

function mentionScore(user, q) {
  const label = memberLabel(user).toLowerCase();
  const email = (user.email || '').toLowerCase();
  const phone = (user.phone || '').toLowerCase();

  if (label.startsWith(q)) return 100;
  if (label.split(/\s+/).some((word) => word.startsWith(q))) return 85;
  if (label.includes(q)) return 70;
  if (email.startsWith(q)) return 60;
  if (email.includes(q)) return 50;
  if (phone.includes(q)) return 40;
  return -1;
}

/** Filter + sort members for @ autocomplete */
export function filterMembersForMention(members, query, limit = 20) {
  if (!members?.length) return [];

  const q = query.trim().toLowerCase();

  if (!q) {
    return [...members].sort(compareMemberNames).slice(0, limit);
  }

  return members
    .map((member) => ({ member, score: mentionScore(member, q) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || compareMemberNames(a.member, b.member))
    .map(({ member }) => member)
    .slice(0, limit);
}

export function insertMention(text, mentionState, user) {
  const label = memberLabel(user);
  const before = text.slice(0, mentionState.start);
  const after = text.slice(mentionState.end);
  const next = `${before}@${label} ${after}`;
  const cursor = before.length + label.length + 2;
  return { text: next, cursor };
}
