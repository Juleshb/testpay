import { authHeaders } from './auth.js';

const API_BASE = '/api/transfers';

async function parseError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  return data.error || fallback;
}

export async function getTransferBalance() {
  const res = await fetch(`${API_BASE}/balance`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load balance'));
  return res.json();
}

export async function lookupTransferRecipient(identifier) {
  const params = new URLSearchParams({ identifier: identifier.trim() });
  const res = await fetch(`${API_BASE}/lookup?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Recipient not found'));
  return res.json();
}

export async function sendTransfer({ recipient, amountUsd, note }) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ recipient, amountUsd, note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Transfer failed');
  return data;
}

export async function getTransferHistory(limit = 30) {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${API_BASE}?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load transfers'));
  return res.json();
}
