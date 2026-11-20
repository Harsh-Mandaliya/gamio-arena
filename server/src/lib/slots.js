import { fromMinutes, isoDate, isWeekend, minutesNow, overlaps, toMinutes } from './time.js';

const PEAK_FROM = 18 * 60;

export function isPeak(date, startMinutes) {
  return startMinutes >= PEAK_FROM || isWeekend(date);
}

export function priceFor(resource, date, startMinutes) {
  if (resource.peak_price != null && isPeak(date, startMinutes)) return resource.peak_price;
  return resource.price_per_slot;
}

/**
 * Lays out the day for one resource. Slots are generated from the venue's
 * hours rather than stored, so changing hours or slot length never leaves
 * stale rows behind.
 *
 * state: open | booked | blocked | past
 */
export function buildSlots({ resource, venue, date, bookings = [], blocks = [], now = new Date() }) {
  const open = toMinutes(venue.opens_at);
  const close = toMinutes(venue.closes_at);
  const step = resource.slot_minutes;
  const today = isoDate(now);
  const nowMin = minutesNow(now);

  const taken = bookings.map((b) => ({ id: b.id, from: toMinutes(b.start_time), to: toMinutes(b.end_time) }));
  const held = blocks.map((b) => ({ reason: b.reason, from: toMinutes(b.start_time), to: toMinutes(b.end_time) }));

  const slots = [];
  for (let t = open; t + step <= close; t += step) {
    const booking = taken.find((b) => overlaps(t, t + step, b.from, b.to));
    const block = booking ? null : held.find((b) => overlaps(t, t + step, b.from, b.to));
    const isPast = date < today || (date === today && t <= nowMin);

    let state = 'open';
    if (booking) state = 'booked';
    else if (block) state = 'blocked';
    else if (isPast) state = 'past';

    slots.push({
      start: fromMinutes(t),
      end: fromMinutes(t + step),
      price: priceFor(resource, date, t),
      peak: resource.peak_price != null && isPeak(date, t),
      state,
      ...(booking && { bookingId: booking.id }),
      ...(block && { reason: block.reason }),
    });
  }
  return slots;
}
