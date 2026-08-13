import { authHeaders } from './auth';

export async function getMyReferrals() {
  const res = await fetch('/api/referrals/me', { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load referrals');
  return data;
}

export async function validateInviteCode(code) {
  const res = await fetch(`/api/referrals/validate/${encodeURIComponent(code)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid invitation code');
  return data;
}
