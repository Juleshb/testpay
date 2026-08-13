import en from './locales/en.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };
import sw from './locales/sw.json' with { type: 'json' };

const locales = { en, fr, sw };
const DEFAULT_LOCALE = 'en';

export function resolveLocale(header) {
  if (!header) return DEFAULT_LOCALE;
  const parts = String(header)
    .split(',')
    .map((part) => part.trim().split(';')[0].toLowerCase());
  for (const part of parts) {
    const code = part.split('-')[0];
    if (locales[code]) return code;
  }
  return DEFAULT_LOCALE;
}

export function t(locale, key, vars = {}) {
  const messages = locales[locale] || locales[DEFAULT_LOCALE];
  let text = messages[key] || locales[DEFAULT_LOCALE][key] || key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{{${name}}}`, String(value));
  }
  return text;
}

export function localeMiddleware(req, _res, next) {
  req.locale = resolveLocale(req.headers['accept-language']);
  req.t = (key, vars) => t(req.locale, key, vars);
  next();
}
