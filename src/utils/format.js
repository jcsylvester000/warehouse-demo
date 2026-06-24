export const money = (n) => {
  if (n == null || n === '') return '—';
  const v = Number(n);
  const s = Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? '-$' : '$') + s; // credits/negatives render as -$115.00, not $-115.00
};

export const num = (n) => Number(n || 0).toLocaleString();

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

export const uid = (p = 'id') => p + '-' + Math.random().toString(36).slice(2, 8);

export const COMPANY = {
  name: 'Carease Health',
  address: '36 Airport Rd., #101, Lakewood, NJ 08701',
  tag: 'Internal Operations Platform — Warehouse',
};
