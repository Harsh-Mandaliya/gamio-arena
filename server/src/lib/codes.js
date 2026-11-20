import crypto from 'node:crypto';

// No 0/O, 1/I/L: codes get read aloud at the front desk.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function bookingCode() {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return `GA-${code}`;
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
}
