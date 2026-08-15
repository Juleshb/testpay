import { authHeaders } from './auth.js';

const API_BASE = '/api/withdrawals';

async function parseError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  return data.error || fallback;
}

export async function getWithdrawOptions() {
  const res = await fetch(`${API_BASE}/options`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load withdraw options'));
  return res.json();
}

export async function getWithdrawBalance() {
  const res = await fetch(`${API_BASE}/balance`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load balance'));
  return res.json();
}

export async function saveWithdrawWallet({ destinationAddress, chainId, tokenSymbol }) {
  const res = await fetch(`${API_BASE}/saved-wallet`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ destinationAddress, chainId, tokenSymbol }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save wallet');
  return data.savedWallet;
}

export async function clearSavedWithdrawWallet() {
  const res = await fetch(`${API_BASE}/saved-wallet`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to clear saved wallet');
  return data.savedWallet;
}

export async function requestWithdrawal({ amountUsd, chainId, tokenSymbol, destinationAddress }) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ amountUsd, chainId, tokenSymbol, destinationAddress }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Withdrawal failed');
  return data;
}

export async function getWithdrawHistory(limit = 50, { status } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status && status !== 'all') params.set('status', status);
  const res = await fetch(`${API_BASE}?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load withdrawals'));
  return res.json();
}

export function explorerTxUrl(explorer, txHash) {
  if (!explorer || !txHash) return null;
  return `${explorer.replace(/\/$/, '')}/tx/${txHash}`;
}

export const WITHDRAW_STATUS_LABELS = {
  PENDING: { label: 'Queued', color: 'warning' },
  PROCESSING: { label: 'Sending', color: 'info' },
  COMPLETED: { label: 'Completed', color: 'success' },
  FAILED: { label: 'Failed', color: 'error' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
};
