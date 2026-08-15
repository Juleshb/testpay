import { authHeaders } from './auth.js';

export async function getAdminTreasuryBalances({ force = false } = {}) {
  const q = force ? '?force=1' : '';
  const res = await fetch(`/api/admin/treasury-balances${q}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load treasury balances');
  }
  return res.json();
}

export async function getAdminTreasuryActivity({ limit = 50 } = {}) {
  const res = await fetch(`/api/admin/treasury-activity?limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load treasury activity');
  }
  return res.json();
}

/** Authenticated SSE for live treasury balances + activity */
export function openAdminTreasuryStream({ onData, onError, onOpen } = {}) {
  const controller = new AbortController();
  let closed = false;

  const run = async () => {
    try {
      const res = await fetch('/api/admin/treasury/stream', {
        headers: {
          ...authHeaders(),
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Treasury stream failed (${res.status})`);
      }
      onOpen?.();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const chunk of parts) {
          const line = chunk
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.startsWith('data:'));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            onData?.(payload);
          } catch {
            // ignore malformed frames
          }
        }
      }
    } catch (err) {
      if (!closed && err.name !== 'AbortError') {
        onError?.(err);
      }
    }
  };

  run();

  return () => {
    closed = true;
    controller.abort();
  };
}

export async function getAdminDashboard() {
  const res = await fetch('/api/admin/dashboard', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load admin dashboard');
  return res.json();
}

export async function getAdminReport({ date } = {}) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await fetch(`/api/admin/reports${q}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load report');
  }
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

export async function getAdminUserAccount(userId) {
  const res = await fetch(`/api/admin/users/${userId}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load user account');
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

export async function listAdminMining() {
  const res = await fetch('/api/admin/mining', { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load mining options');
  }
  return res.json();
}

export async function createAdminMining(data) {
  const res = await fetch('/api/admin/mining', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to create mining option');
  return body;
}

export async function updateAdminMining(id, data) {
  const res = await fetch(`/api/admin/mining/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to update mining option');
  return body;
}

export async function deleteAdminMining(id) {
  const res = await fetch(`/api/admin/mining/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to delete mining option');
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

export async function getAdminWithdrawSettings() {
  const res = await fetch('/api/admin/withdrawals/settings', { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load withdraw settings');
  return data;
}

export async function updateAdminWithdrawSettings(payload) {
  const res = await fetch('/api/admin/withdrawals/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update withdraw settings');
  return data;
}

export async function listAdminWithdrawals({ status = 'all', limit = 100 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status && status !== 'all') params.set('status', status);
  const res = await fetch(`/api/admin/withdrawals?${params}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to list withdrawals');
  return data;
}

export async function cancelAdminWithdrawal(id, reason) {
  const res = await fetch(`/api/admin/withdrawals/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to cancel withdrawal');
  return data;
}

export async function retryAdminWithdrawal(id) {
  const res = await fetch(`/api/admin/withdrawals/${id}/retry`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to retry withdrawal');
  return data;
}

export async function processAdminWithdrawal(id) {
  const res = await fetch(`/api/admin/withdrawals/${id}/process`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to process withdrawal');
  return data;
}

export async function processAdminWithdrawQueue() {
  const res = await fetch('/api/admin/withdrawals/process-queue', {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to process queue');
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
