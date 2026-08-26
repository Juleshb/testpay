import { authHeaders } from './auth.js';

const API_BASE = '/api';

export async function getNetworks() {
  const res = await fetch(`${API_BASE}/networks`);
  if (!res.ok) throw new Error('Failed to load networks');
  return res.json();
}

export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/payments/stats/dashboard`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load dashboard stats');
  }
  return res.json();
}

export async function createPayment({ amount, amountUsd, email, name, chainId, tokenSymbol }) {
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ amount, amountUsd, email, name, chainId, tokenSymbol }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create payment');
  }
  return res.json();
}

export async function getPayment(id) {
  const res = await fetch(`${API_BASE}/payments/${id}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get payment');
  }
  return res.json();
}

export async function getPaymentBalance(id) {
  const res = await fetch(`${API_BASE}/payments/${id}/balance`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to check balance');
  }
  return res.json();
}

export async function listPayments() {
  const res = await fetch(`${API_BASE}/payments`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to list payments');
  }
  return res.json();
}

export async function registerPaymentTx(id, txHash) {
  const res = await fetch(`${API_BASE}/payments/${id}/tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ txHash }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to register transaction');
  }
  return res.json();
}

export async function getConfig() {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to get config');
  return res.json();
}

export async function getLiveQuotes() {
  const res = await fetch(`${API_BASE}/public/quotes`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load quotes');
  }
  return res.json();
}

/** AI help bot chat — falls back to local FAQ on the client if AI is off. */
export async function askHelpBot({ question, history = [], language = 'en', context = 'default' }) {
  const res = await fetch(`${API_BASE}/help/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ question, history, language, context }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.answer) {
    throw new Error(data.message || data.error || 'Help bot request failed');
  }
  return data;
}

export async function getHelpBotStatus() {
  const res = await fetch(`${API_BASE}/help/status`);
  if (!res.ok) return { aiEnabled: false };
  return res.json();
}
