import { authHeaders } from './auth.js';

const API_BASE = '/api/packages';

export async function getPackages() {
  const res = await fetch(`${API_BASE}/plans`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load packages');
  return res.json();
}

export async function getPackageDashboard() {
  const res = await fetch(`${API_BASE}/dashboard`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load package dashboard');
  return res.json();
}

export async function getPackageInvestments() {
  const res = await fetch(`${API_BASE}/investments`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load investments');
  return res.json();
}

export async function getPackageIncome() {
  const res = await fetch(`${API_BASE}/income`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load income history');
  return res.json();
}

export async function investPackage({ packageId, amount }) {
  const res = await fetch(`${API_BASE}/invest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ packageId, amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Investment failed');
  return data;
}

export function calcEstimatedDaily(amount, dailyRate) {
  const n = parseFloat(amount);
  const r = parseFloat(dailyRate);
  if (isNaN(n) || isNaN(r) || n <= 0) return '0';
  return (n * (r / 100)).toFixed(4);
}

export function getPackageEligibility(pkg, availableUsd) {
  const balance = parseFloat(availableUsd) || 0;
  const min = parseFloat(pkg.minAmount) || 0;
  const max = pkg.maxAmount ? parseFloat(pkg.maxAmount) : Infinity;

  if (balance < min) {
    const shortfall = Math.max(0, min - balance);
    return {
      eligible: false,
      shortfall: shortfall.toFixed(2),
      suggestedAmount: null,
      dailyIncome: null,
    };
  }

  const suggested = Math.min(balance, max);
  return {
    eligible: true,
    shortfall: null,
    suggestedAmount: suggested.toFixed(2),
    dailyIncome: calcEstimatedDaily(String(suggested), pkg.dailyRate),
  };
}
