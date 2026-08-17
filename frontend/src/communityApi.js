import { authHeaders } from './auth.js';

const API_BASE = '/api/community';

async function parseError(res, fallback) {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function getChannels() {
  const res = await fetch(`${API_BASE}/channels`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load channels'));
  return res.json();
}

export async function getCommunityFeed(channel = 'general') {
  const res = await fetch(`${API_BASE}/feed?channel=${encodeURIComponent(channel)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load community feed'));
  return res.json();
}

export async function postCommunityMessage(content, channel = 'general') {
  const res = await fetch(`${API_BASE}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content, channel }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to post');
  return data;
}

export async function togglePostReaction(postId, emoji) {
  const res = await fetch(`${API_BASE}/feed/${postId}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ emoji }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to react');
  return data;
}

export async function getUnreadSummary() {
  const res = await fetch(`${API_BASE}/unread-summary`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load unread summary'));
  return res.json();
}

export async function markChannelRead(slug) {
  const res = await fetch(`${API_BASE}/channels/${encodeURIComponent(slug)}/read`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to mark channel read'));
  return res.json();
}

export async function setChannelChat(slug, chatEnabled) {
  const res = await fetch(`${API_BASE}/channels/${encodeURIComponent(slug)}/chat`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ chatEnabled: Boolean(chatEnabled) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to update chat');
  return data;
}

export async function getCommunityMembers(query = '') {
  const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  const res = await fetch(`${API_BASE}/members${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load members'));
  return res.json();
}

export async function getConversations() {
  const res = await fetch(`${API_BASE}/conversations`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load conversations'));
  return res.json();
}

export async function startConversation({ userId, initialMessage, quotedPostId, quotedContent }) {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ userId, initialMessage, quotedPostId, quotedContent }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to start conversation');
  return data;
}

export async function getConversationMessages(conversationId) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load messages'));
  return res.json();
}

export async function sendDirectMessage(conversationId, content, quote = {}) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      content,
      quotedPostId: quote.quotedPostId,
      quotedContent: quote.quotedContent,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send message');
  return data;
}

export function memberLabel(user) {
  if (!user) return 'User';
  if (user.username) return `@${user.username}`;
  return user.displayName || user.name || user.email || user.phone || 'User';
}

export function memberAvatarProps(user, fallbackName) {
  return {
    name: fallbackName || memberLabel(user),
    avatarUrl: user?.avatarUrl,
    userId: user?.id,
  };
}

export function buildPrivateReplyQuote(post) {
  const author = memberLabel(post.author);
  const excerpt = post.content.length > 180 ? `${post.content.slice(0, 180)}…` : post.content;
  const quotedContent = `${author}: "${excerpt}"`;
  return {
    quotedPostId: post.id,
    quotedContent,
    quotedAuthor: author,
    quotedExcerpt: excerpt,
    draft: '',
  };
}
