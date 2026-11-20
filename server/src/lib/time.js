// All scheduling happens in the venue's local time, which is the server's local time.

const pad = (n) => String(n).padStart(2, '0');

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}

export function isWeekend(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

export function minutesNow(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

/** Hours from `now` until the given local date + time (negative if past). */
export function hoursUntil(date, time, now = new Date()) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return (new Date(y, m - 1, d, hh, mm) - now) / 36e5;
}

export const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
