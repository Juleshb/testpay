import { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from '../data/countryCodes';

function filterCountries(query) {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRY_CODES;
  const digits = q.replace(/\D/g, '');
  return COUNTRY_CODES.filter(
    (c) =>
      c.country.toLowerCase().includes(q) ||
      c.iso.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (digits && c.code.replace(/\D/g, '').startsWith(digits))
  );
}

export default function CountryCodeSelect({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const selected = useMemo(() => {
    return (
      COUNTRY_CODES.find((c) => c.code === value) ||
      COUNTRY_CODES.find((c) => c.code === DEFAULT_COUNTRY_CODE)
    );
  }, [value]);

  const filtered = useMemo(() => filterCountries(search), [search]);

  useEffect(() => {
    if (!open) return;

    searchRef.current?.focus();

    const handleClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleSelect = (country) => {
    onChange(country.code);
    setOpen(false);
    setSearch('');
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => {
      if (prev) setSearch('');
      return !prev;
    });
  };

  return (
    <div ref={containerRef} className="relative w-[46%] sm:w-[52%] max-w-[240px] shrink-0">
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input-field w-full text-sm text-left flex items-center justify-between gap-1 disabled:opacity-50"
      >
        <span className="truncate">{selected.code}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-[min(320px,calc(100vw-2rem))] bg-surface-light border border-white/10 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code..."
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Search country"
            />
          </div>
          <ul
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
            aria-label="Country codes"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">No countries found</li>
            ) : (
              filtered.map((c) => {
                const isSelected = c.code === value;
                return (
                  <li key={c.iso} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors ${
                        isSelected ? 'bg-primary/20 text-white' : 'text-white/90'
                      }`}
                    >
                      <span className="font-medium">{c.code}</span>
                      <span className="text-muted ml-2">{c.country}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
