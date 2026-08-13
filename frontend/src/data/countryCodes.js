import COUNTRY_CODES from './countryCodes.json';

export { COUNTRY_CODES };

export const DEFAULT_COUNTRY_CODE = '+1';

const codesByLength = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

export function parsePhoneNumber(fullPhone) {
  if (!fullPhone?.trim()) {
    return { countryCode: DEFAULT_COUNTRY_CODE, localNumber: '' };
  }

  let normalized = fullPhone.trim().replace(/[\s\-().]/g, '');
  if (!normalized.startsWith('+')) normalized = `+${normalized.replace(/^0+/, '')}`;

  for (const entry of codesByLength) {
    if (normalized.startsWith(entry.code)) {
      return {
        countryCode: entry.code,
        localNumber: normalized.slice(entry.code.length),
      };
    }
  }

  return {
    countryCode: DEFAULT_COUNTRY_CODE,
    localNumber: normalized.replace(/^\+/, ''),
  };
}

export function combinePhoneNumber(countryCode, localNumber) {
  const local = localNumber.trim().replace(/[\s\-().]/g, '');
  if (!local) return '';
  return `${countryCode || DEFAULT_COUNTRY_CODE}${local}`;
}
