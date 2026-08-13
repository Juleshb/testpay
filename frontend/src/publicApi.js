export async function getPublicShowcase() {
  const res = await fetch('/api/public/showcase');
  if (!res.ok) throw new Error('Failed to load showcase');
  return res.json();
}

export async function submitPublicReview(body) {
  const res = await fetch('/api/public/testimonials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit review');
  return data;
}

export async function getPublicMeta() {
  const res = await fetch('/api/public/meta');
  if (!res.ok) throw new Error('Failed to load app meta');
  return res.json();
}
