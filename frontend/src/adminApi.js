import { authHeaders } from './auth.js';

export async function getAdminDashboard() {
  const res = await fetch('/api/admin/dashboard', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load admin dashboard');
  return res.json();
}

export async function triggerSweep() {
  const res = await fetch('/api/admin/sweep', {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sweep failed');
  return data;
}

export async function listAdminPayments() {
  const res = await fetch('/api/admin/payments', { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load payments');
  }
  return res.json();
}

export async function listAdminUsers() {
  const res = await fetch('/api/admin/users', { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load users');
  }
  return res.json();
}

export async function listAdminPackages() {
  const res = await fetch('/api/admin/packages', { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load packages');
  }
  return res.json();
}

export async function createAdminPackage(data) {
  const res = await fetch('/api/admin/packages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to create package');
  return body;
}

export async function updateAdminPackage(id, data) {
  const res = await fetch(`/api/admin/packages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to update package');
  return body;
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export { formatUptime };

export async function getAdminReferralSettings() {
  const res = await fetch('/api/admin/referrals/settings', { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load referral settings');
  return data;
}

export async function updateAdminReferralSettings(commissionPercent) {
  const res = await fetch('/api/admin/referrals/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ commissionPercent }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update referral settings');
  return data;
}

export async function listAdminReferralCommissions() {
  const res = await fetch('/api/admin/referrals/commissions', { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load commissions');
  return data;
}

export async function listAdminShowcaseTeam() {
  const res = await fetch('/api/admin/showcase-team', { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load showcase team');
  return data;
}

export async function createAdminShowcaseMember(body) {
  const res = await fetch('/api/admin/showcase-team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create team member');
  return data;
}

export async function updateAdminShowcaseMember(id, body) {
  const res = await fetch(`/api/admin/showcase-team/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update team member');
  return data;
}

export async function deleteAdminShowcaseMember(id) {
  const res = await fetch(`/api/admin/showcase-team/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete team member');
  return data;
}

export async function listAdminTestimonials() {
  const res = await fetch('/api/admin/testimonials', { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load testimonials');
  return data;
}

export async function updateAdminTestimonial(id, body) {
  const res = await fetch(`/api/admin/testimonials/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update testimonial');
  return data;
}

export async function deleteAdminTestimonial(id) {
  const res = await fetch(`/api/admin/testimonials/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete testimonial');
  return data;
}
