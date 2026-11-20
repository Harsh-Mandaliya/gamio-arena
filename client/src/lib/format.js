const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

export const money = (n) => inr.format(n ?? 0);
export const moneyShort = (n) => `₹${compact.format(n ?? 0)}`;

const pad = (n) => String(n).padStart(2, '0');

export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, days) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function dayLabel(iso, today = isoDate()) {
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  if (iso === addDays(today, -1)) return 'Yesterday';
  return parseDate(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const longDate = (iso) =>
  parseDate(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const shortDate = (iso) => parseDate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** "18:00" -> "6:00 pm" */
export function clock(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${pad(m)} ${suffix}`;
}

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function duration(start, end) {
  const mins = toMinutes(end) - toMinutes(start);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h} hr${h > 1 ? 's' : ''}`;
}

/** SQLite "YYYY-MM-DD HH:MM:SS" (UTC) -> "21 Nov, 6:30 pm" */
export function stamp(sqlDate) {
  if (!sqlDate) return '—';
  const d = new Date(sqlDate.replace(' ', 'T') + 'Z');
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function relative(sqlDate) {
  if (!sqlDate) return 'never';
  const then = new Date(sqlDate.replace(' ', 'T') + 'Z');
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days}d ago` : stamp(sqlDate);
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
