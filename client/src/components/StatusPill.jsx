import { BOOKING_STATUS, ENQUIRY_STATUS, PAYMENT_STATUS } from '../lib/status.js';

const MAPS = { booking: BOOKING_STATUS, payment: PAYMENT_STATUS, enquiry: ENQUIRY_STATUS };

export default function StatusPill({ kind = 'booking', value }) {
  const s = MAPS[kind][value] ?? { label: value, tone: '' };
  return <span className={`pill pill--${s.tone}`}>{s.label}</span>;
}
