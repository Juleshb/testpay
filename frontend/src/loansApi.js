import { authHeaders } from './auth';

export async function getLoanDashboard() {
  const res = await fetch('/api/loans/dashboard', { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load loan info');
  return data;
}

export async function applyForLoan(acceptTerms = true) {
  const res = await fetch('/api/loans/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ acceptTerms }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to apply for loan');
  return data;
}
