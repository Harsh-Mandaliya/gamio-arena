import { config } from '../config.js';
import { all, one, run, transaction } from '../db/index.js';
import { badRequest, conflict, forbidden, notFound } from '../http/errors.js';
import { bookingCode } from '../lib/codes.js';
import { buildSlots } from '../lib/slots.js';
import { addDays, hoursUntil, isoDate } from '../lib/time.js';
import { record } from './audit.js';
import { assertVenueAccess, canAccessVenue } from './scope.js';
import { moveFunds } from './wallet.js';

export const BOOKING_SELECT = `
  SELECT b.*,
         r.name AS resource_name, r.capacity, r.slot_minutes,
         a.id AS activity_id, a.name AS activity_name, a.slug AS activity_slug,
         a.icon AS activity_icon, a.color AS activity_color,
         v.id AS venue_id, v.name AS venue_name, v.slug AS venue_slug,
         v.city AS venue_city, v.address AS venue_address, v.accent AS venue_accent,
         u.name AS user_name, u.email AS user_email, u.phone AS user_phone
    FROM bookings b
    JOIN resources r ON r.id = b.resource_id
    JOIN activities a ON a.id = r.activity_id
    JOIN venues v ON v.id = r.venue_id
    LEFT JOIN users u ON u.id = b.user_id`;

export function shapeBooking(row) {
  return {
    id: row.id,
    code: row.code,
    date: row.date,
    start: row.start_time,
    end: row.end_time,
    players: row.players,
    amount: row.amount,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    note: row.note,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    customer: {
      id: row.user_id,
      name: row.user_name ?? row.guest_name ?? 'Walk-in guest',
      email: row.user_email ?? null,
      phone: row.user_phone ?? row.guest_phone ?? null,
      guest: !row.user_id,
    },
    resource: { id: row.resource_id, name: row.resource_name, capacity: row.capacity },
    activity: {
      id: row.activity_id,
      name: row.activity_name,
      slug: row.activity_slug,
      icon: row.activity_icon,
      color: row.activity_color,
    },
    venue: {
      id: row.venue_id,
      name: row.venue_name,
      slug: row.venue_slug,
      city: row.venue_city,
      address: row.venue_address,
      accent: row.venue_accent,
    },
  };
}

export function findBooking(where, ...params) {
  const row = one(`${BOOKING_SELECT} WHERE ${where}`, ...params);
  return row ? shapeBooking(row) : null;
}

function loadResource(resourceId) {
  return one(
    `SELECT r.*, v.opens_at, v.closes_at, v.is_active AS venue_active
       FROM resources r JOIN venues v ON v.id = r.venue_id
      WHERE r.id = ?`,
    resourceId,
  );
}

export function slotsFor(resourceId, date, now = new Date()) {
  const resource = loadResource(resourceId);
  if (!resource) throw notFound('Table or court');

  const bookings = all(
    `SELECT id, start_time, end_time FROM bookings
      WHERE resource_id = ? AND date = ? AND status != 'cancelled'`,
    resourceId,
    date,
  );
  const blocks = all('SELECT start_time, end_time, reason FROM blocks WHERE resource_id = ? AND date = ?', resourceId, date);

  return {
    resource,
    slots: buildSlots({
      resource,
      venue: { opens_at: resource.opens_at, closes_at: resource.closes_at },
      date,
      bookings,
      blocks,
      now,
    }),
  };
}

/** Can this viewer cancel this booking right now? Returns a reason when not. */
export function cancelVerdict(viewer, booking, now = new Date()) {
  if (booking.status !== 'confirmed') return { ok: false, reason: 'Only upcoming bookings can be cancelled' };

  if (viewer.role === 'player') {
    if (booking.customer.id !== viewer.id) return { ok: false, reason: 'Not your booking' };
    if (hoursUntil(booking.date, booking.start, now) < config.cancelWindowHours) {
      return { ok: false, reason: `Cancellations close ${config.cancelWindowHours}h before start. Call the venue.` };
    }
    return { ok: true };
  }

  return canAccessVenue(viewer, booking.venue.id) ? { ok: true } : { ok: false, reason: 'Outside your venues' };
}

export function createBooking(actor, input, now = new Date()) {
  const { resourceId, date, start, slotCount = 1, players = 1, paymentMethod = 'venue', note = null } = input;
  const isDesk = actor.role !== 'player';

  return transaction(() => {
    const today = isoDate(now);
    if (date < today) throw badRequest("That date has already gone by");
    if (date > addDays(today, config.bookingHorizonDays)) {
      throw badRequest(`Bookings open ${config.bookingHorizonDays} days ahead`);
    }

    const { resource, slots } = slotsFor(resourceId, date, now);
    if (!resource.is_active || !resource.venue_active) throw conflict('This one is not taking bookings right now');
    if (isDesk) assertVenueAccess(actor, resource.venue_id);

    const first = slots.findIndex((s) => s.start === start);
    if (first === -1) throw badRequest('Pick a start time from the grid');

    const chosen = slots.slice(first, first + slotCount);
    if (chosen.length < slotCount) throw badRequest('Not enough time left before closing');

    const blocked = chosen.find((s) => s.state !== 'open');
    if (blocked) {
      const why = { booked: 'was just booked', blocked: 'is blocked off', past: 'has already started' }[blocked.state];
      throw conflict(`The ${blocked.start} slot ${why}`);
    }

    if (players < 1 || players > resource.capacity) {
      throw badRequest(`${resource.name} takes 1 to ${resource.capacity} players`);
    }

    // Who is this for? Players book for themselves; the desk can book for a
    // registered player or a walk-in guest.
    let userId = actor.id;
    let guestName = null;
    let guestPhone = null;
    if (isDesk) {
      userId = input.customerId ?? null;
      if (userId && !one("SELECT 1 FROM users WHERE id = ? AND role = 'player' AND is_active = 1", userId)) {
        throw notFound('Player');
      }
      if (!userId) {
        guestName = input.guestName?.trim();
        guestPhone = input.guestPhone?.trim() || null;
        if (!guestName) throw badRequest('Add a name for the walk-in', { guestName: 'Required for walk-ins' });
      }
    }

    if (paymentMethod === 'wallet' && !userId) throw badRequest('Walk-in guests pay at the counter');

    const amount = chosen.reduce((sum, s) => sum + s.price, 0);
    const paid = paymentMethod === 'wallet' || (isDesk && input.markPaid);

    let code;
    do code = bookingCode();
    while (one('SELECT 1 FROM bookings WHERE code = ?', code));

    const { lastInsertRowid: id } = run(
      `INSERT INTO bookings (code, user_id, guest_name, guest_phone, resource_id, date, start_time, end_time,
                             players, amount, payment_method, payment_status, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      code,
      userId,
      guestName,
      guestPhone,
      resourceId,
      date,
      chosen[0].start,
      chosen.at(-1).end,
      players,
      amount,
      paymentMethod,
      paid ? 'paid' : 'unpaid',
      note || null,
      actor.id,
    );

    if (paymentMethod === 'wallet') {
      moveFunds({ userId, amount: -amount, kind: 'booking', bookingId: id, note: `${resource.name}, ${date} ${start}`, actorId: actor.id });
    }

    record(actor.id, 'booking.create', 'booking', Number(id), { code, amount, paymentMethod });
    return findBooking('b.id = ?', id);
  });
}

export function cancelBooking(actor, bookingId, reason, now = new Date()) {
  return transaction(() => {
    const booking = findBooking('b.id = ?', bookingId);
    if (!booking) throw notFound('Booking');
    if (actor.role === 'player' && booking.customer.id !== actor.id) throw notFound('Booking');

    const verdict = cancelVerdict(actor, booking, now);
    if (!verdict.ok) throw conflict(verdict.reason);

    let paymentStatus = booking.paymentStatus;
    if (booking.paymentStatus === 'paid') {
      // Registered players get their money back as wallet credit; cash walk-ins are refunded at the desk.
      if (booking.customer.id) {
        moveFunds({
          userId: booking.customer.id,
          amount: booking.amount,
          kind: 'refund',
          bookingId: booking.id,
          note: `Refund for ${booking.code}`,
          actorId: actor.id,
        });
      }
      paymentStatus = 'refunded';
    }

    run(
      `UPDATE bookings SET status = 'cancelled', payment_status = ?, cancel_reason = ?, updated_at = datetime('now')
        WHERE id = ?`,
      paymentStatus,
      reason || (actor.role === 'player' ? 'Cancelled by player' : 'Cancelled by venue'),
      booking.id,
    );
    record(actor.id, 'booking.cancel', 'booking', booking.id, { code: booking.code, refunded: paymentStatus === 'refunded' });
    return findBooking('b.id = ?', booking.id);
  });
}

const NEXT_STATUS = {
  confirmed: ['checked_in', 'completed', 'no_show'],
  checked_in: ['completed'],
};

export function updateBooking(actor, bookingId, { status, paymentStatus }) {
  return transaction(() => {
    const booking = findBooking('b.id = ?', bookingId);
    if (!booking) throw notFound('Booking');
    assertVenueAccess(actor, booking.venue.id);

    if (status && status !== booking.status) {
      if (status === 'cancelled') throw badRequest('Use cancel to cancel a booking');
      if (!NEXT_STATUS[booking.status]?.includes(status)) {
        throw conflict(`Can't move a ${booking.status.replace('_', ' ')} booking to ${status.replace('_', ' ')}`);
      }
      run("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?", status, booking.id);
      record(actor.id, `booking.${status}`, 'booking', booking.id, { code: booking.code });
    }

    if (paymentStatus && paymentStatus !== booking.paymentStatus) {
      if (paymentStatus !== 'paid' || booking.paymentStatus !== 'unpaid') {
        throw conflict('Only unpaid bookings can be marked as paid');
      }
      if (booking.status === 'cancelled') throw conflict('This booking was cancelled');
      run("UPDATE bookings SET payment_status = 'paid', updated_at = datetime('now') WHERE id = ?", booking.id);
      record(actor.id, 'booking.paid', 'booking', booking.id, { code: booking.code, amount: booking.amount });
    }

    return findBooking('b.id = ?', booking.id);
  });
}

export function assertCanView(viewer, booking) {
  if (viewer.role === 'player' ? booking.customer.id !== viewer.id : !canAccessVenue(viewer, booking.venue.id)) {
    throw forbidden();
  }
}
