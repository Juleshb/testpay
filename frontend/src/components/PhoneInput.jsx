import CountryCodeSelect from './CountryCodeSelect';
import { DEFAULT_COUNTRY_CODE } from '../data/countryCodes';

export default function PhoneInput({
  countryCode = DEFAULT_COUNTRY_CODE,
  localNumber = '',
  onCountryCodeChange,
  onLocalNumberChange,
  disabled = false,
}) {
  return (
    <div className="flex gap-2">
      <CountryCodeSelect
        value={countryCode}
        onChange={onCountryCodeChange}
        disabled={disabled}
      />
      <input
        type="tel"
        inputMode="tel"
        value={localNumber}
        onChange={(e) => onLocalNumberChange(e.target.value.replace(/[^\d\s\-]/g, ''))}
        placeholder="788 123 456"
        disabled={disabled}
        className="input-field flex-1 min-w-0"
        aria-label="Phone number"
      />
    </div>
  );
}
