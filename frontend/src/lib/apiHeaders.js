import { getAcceptLanguage } from '../i18n';

export function apiHeaders(extra = {}) {
  return {
    'Accept-Language': getAcceptLanguage(),
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function parseApiError(res, data, fallback = 'Something went wrong') {
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  return fallback;
}
