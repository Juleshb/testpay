/** Extract unique payment IDs from DM text containing /pay/:id links. */
export function extractPaymentIds(text) {
  if (!text || typeof text !== 'string') return [];
  const re = /\/pay\/([a-z0-9]{8,})/gi;
  const ids = [];
  const seen = new Set();
  let match;
  while ((match = re.exec(text)) !== null) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** Remove bare /pay/:id URLs from text when buttons are shown separately. */
export function stripPaymentUrls(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/https?:\/\/[^\s]*\/pay\/[a-z0-9]{8,}/gi, '')
    .replace(/(^|\s)\/pay\/[a-z0-9]{8,}/gi, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
