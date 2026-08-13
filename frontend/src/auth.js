const TOKEN_KEY = 'stackpay_token';
const LEGACY_TOKEN_KEY = 'crptopay_token';

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacy) {
    localStorage.setItem(TOKEN_KEY, legacy);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacy;
  }
  return null;
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function userDisplayId(user) {
  if (!user) return '';
  if (user.username) return `@${user.username}`;
  return user.email || user.phone || user.name || 'User';
}

import { apiHeaders as buildApiHeaders } from './lib/apiHeaders.js';

function authHeaders() {
  const token = getToken();
  return buildApiHeaders(token ? { Authorization: `Bearer ${token}` } : {});
}

export async function register({
  email,
  phone,
  password,
  confirmPassword,
  name,
  invitationCode,
  acceptedTerms,
}) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      email,
      phone,
      password,
      confirmPassword,
      name,
      invitationCode,
      acceptedTerms,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  setToken(data.token);
  return data;
}

export async function login({ identifier, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  setToken(data.token);
  return data;
}

export async function getMe() {
  const res = await fetch('/api/auth/me', { headers: authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export async function updateProfile({ name, email, phone, avatarUrl }) {
  const res = await fetch('/api/auth/me', {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ name, email, phone, avatarUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Update failed');
  return data.user;
}

export function logout() {
  clearToken();
}

export { authHeaders };
