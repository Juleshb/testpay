const CONSENT_KEY = 'stackpay-cookie-consent';

export const COOKIE_CONSENT = {
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
};

export function getCookieConsent() {
  return localStorage.getItem(CONSENT_KEY);
}

export function hasCookieConsent() {
  return getCookieConsent() === COOKIE_CONSENT.ACCEPTED;
}

export function setCookieConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
}

export function clearCookieConsent() {
  localStorage.removeItem(CONSENT_KEY);
}
