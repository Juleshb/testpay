import { apiHeaders } from './apiHeaders';

const TOKEN_KEY = 'stackpay_api_access_token';

export function getApiAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setApiAccessToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearApiAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function getDeveloperAccessPricing() {
  const res = await fetch('/api/public/developer-access/pricing', {
    headers: apiHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load pricing');
  return data;
}

export async function registerDeveloperAccess(body) {
  const res = await fetch('/api/public/developer-access/register', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to register');
  return data;
}

export async function verifyDeveloperAccess(token = getApiAccessToken()) {
  if (!token) return null;
  const res = await fetch('/api/public/developer-access/verify', {
    headers: apiHeaders({ Authorization: `Bearer ${token}` }),
  });
  const data = await res.json();
  if (!res.ok) {
    clearApiAccessToken();
    throw new Error(data.error || 'Invalid access token');
  }
  return data;
}
