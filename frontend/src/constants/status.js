export const STATUS_VARIANTS = {
  PENDING: {
    badge:
      'bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] text-[var(--color-warning)] border-[color-mix(in_srgb,var(--color-warning)_25%,transparent)]',
    dot: 'bg-[var(--color-warning)]',
    text: 'text-[var(--color-warning)]',
  },
  CONFIRMED: {
    badge:
      'bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-success)] border-[color-mix(in_srgb,var(--color-success)_25%,transparent)]',
    dot: 'bg-[var(--color-success)]',
    text: 'text-[var(--color-success)]',
  },
  SWEPT: {
    badge:
      'bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-[var(--color-accent)] border-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]',
    dot: 'bg-[var(--color-accent)]',
    text: 'text-[var(--color-accent)]',
  },
  EXPIRED: {
    badge:
      'bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] text-[var(--color-danger)] border-[color-mix(in_srgb,var(--color-danger)_25%,transparent)]',
    dot: 'bg-[var(--color-danger)]',
    text: 'text-[var(--color-danger)]',
  },
};

export function getStatusVariant(status) {
  return STATUS_VARIANTS[status] || STATUS_VARIANTS.PENDING;
}

/** Users see SWEPT as CONFIRMED — sweep is an internal platform step. */
export function getDisplayStatus(status, isAdmin = false) {
  if (!isAdmin && status === 'SWEPT') return 'CONFIRMED';
  return status;
}

export function matchesStatusFilter(paymentStatus, filterStatus, isAdmin = false) {
  if (filterStatus === 'all') return true;
  if (!isAdmin && filterStatus === 'CONFIRMED') {
    return paymentStatus === 'CONFIRMED' || paymentStatus === 'SWEPT';
  }
  return paymentStatus === filterStatus;
}

export const USER_STATUS_OPTIONS = [
  { value: 'all', labelKey: 'status.all' },
  { value: 'PENDING', labelKey: 'status.pending' },
  { value: 'CONFIRMED', labelKey: 'status.confirmed' },
  { value: 'EXPIRED', labelKey: 'status.expired' },
];
