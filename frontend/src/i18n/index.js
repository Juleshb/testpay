import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import sw from './locales/sw.json';
import enPages from './locales/en/pages.json';
import frPages from './locales/fr/pages.json';
import swPages from './locales/sw/pages.json';

export const LANGUAGE_STORAGE_KEY = 'stackpay_language';

export const LANGUAGES = [
  { code: 'en', labelKey: 'language.en', nativeLabel: 'English' },
  { code: 'fr', labelKey: 'language.fr', nativeLabel: 'Français' },
  { code: 'sw', labelKey: 'language.sw', nativeLabel: 'Kiswahili' },
];

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

const saved = typeof window !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
const initialLng = LANGUAGES.some((lang) => lang.code === saved) ? saved : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: deepMerge(en, enPages) },
    fr: { translation: deepMerge(fr, frPages) },
    sw: { translation: deepMerge(sw, swPages) },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLng;
}

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  document.documentElement.lang = lng;
});

export function getAcceptLanguage() {
  return i18n.language || 'en';
}

export default i18n;
