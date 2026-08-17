import { authHeaders } from './auth.js';

const API_BASE = '/api/mining';

export async function getMiningOptions() {
  const res = await fetch(`${API_BASE}/plans`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load mining options');
  return res.json();
}

export async function getMiningDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load mining dashboard');
  return res.json();
}

export async function getMiningPositions() {
  const res = await fetch(`${API_BASE}/positions`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load mining positions');
  return res.json();
}

export async function getMiningIncome() {
  const res = await fetch(`${API_BASE}/income`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load mining income history');
  return res.json();
}

export async function startMining({ optionId, amount }) {
  const res = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ optionId, amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to start mining');
  return data;
}

export function calcEstimatedDaily(amount, dailyRate) {
  const n = parseFloat(amount);
  const r = parseFloat(dailyRate);
  if (isNaN(n) || isNaN(r) || n <= 0) return '0';
  return (n * (r / 100)).toFixed(4);
}

export function getMiningEligibility(option, availableUsd) {
  if (option.isFree) {
    return {
      eligible: true,
      shortfall: null,
      suggestedAmount: option.minAmount,
      dailyIncome: calcEstimatedDaily(option.minAmount, option.dailyRate),
      isFree: true,
    };
  }

  const balance = parseFloat(availableUsd) || 0;
  const min = parseFloat(option.minAmount) || 0;
  const max = option.maxAmount ? parseFloat(option.maxAmount) : Infinity;

  if (balance < min) {
    const shortfall = Math.max(0, min - balance);
    return {
      eligible: false,
      shortfall: shortfall.toFixed(2),
      suggestedAmount: null,
      dailyIncome: null,
      isFree: false,
    };
  }

  const suggested = Math.min(balance, max);
  return {
    eligible: true,
    shortfall: null,
    suggestedAmount: suggested.toFixed(2),
    dailyIncome: calcEstimatedDaily(String(suggested), option.dailyRate),
    isFree: false,
  };
}
