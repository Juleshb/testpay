const AVATAR_URL_PATTERN = /^https?:\/\/.+/i;

export function isValidAvatarUrl(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!AVATAR_URL_PATTERN.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeAvatarUrl(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (!isValidAvatarUrl(trimmed)) {
    throw new Error('Profile image must be a valid http(s) URL');
  }
  return trimmed;
}

export function resolveAvatarUrl(user) {
  if (user?.avatarUrl?.trim()) return user.avatarUrl.trim();
  const seed = encodeURIComponent(user?.id || user?.username || user?.name || 'guest');
  return `https://api.dicebear.com/9.x/notionists/png?seed=${seed}&size=128&backgroundColor=0b0b0b,141918&backgroundType=gradientLinear`;
}

export function withAvatar(user) {
  if (!user) return user;
  return {
    ...user,
    avatarUrl: resolveAvatarUrl(user),
  };
}
