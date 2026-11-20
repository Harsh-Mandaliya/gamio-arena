import { Router } from 'express';
import { z } from 'zod';
import { all, one } from '../../db/index.js';
import { requireRole } from '../../http/auth.js';
import { badRequest, notFound } from '../../http/errors.js';
import { isoDate } from '../../lib/time.js';
import { record } from '../../services/audit.js';
import {
  BOOKING_SELECT,
  cancelBooking,
  cancelVerdict,
  createBooking,
  findBooking,
  shapeBooking,
  updateBooking,
} from '../../services/bookings.js';
import { assertVenueAccess, venueFilter, venueIdsFor } from '../../services/scope.js';
import { ledger, moveFunds } from '../../services/wallet.js';
import { config } from '../../config.js';

const router = Router();

const withVerdict = (viewer, b) => ({ ...b, cancel: cancelVerdict(viewer, b) });

function defaultVenueId(user) {
  const ids = venueIdsFor(user);
  if (ids === null) return one('SELECT id FROM venues WHERE is_active = 1 ORDER BY id LIMIT 1')?.id;
  return ids[0];
}

/** Venues the signed-in console user can pick from. */
router.get('/my-venues', (req, res) => {
  const scope = venueFilter(req.user, 'id');
  res.json(all(`SELECT id, name, slug, city, opens_at AS opensAt, closes_at AS closesAt, accent FROM venues WHERE ${scope.sql} ORDER BY name`, ...scope.params));
});

const scheduleQuery = z.object({
  venueId: z.coerce.number().int().positive().optional(),
  date: z.iso.date().default(() => isoDate()),
});

/** The front-desk board: every resource at a venue with that day's bookings and blocks. */
router.get('/schedule', (req, res) => {
  const q = scheduleQuery.parse(req.query);
  const venueId = q.venueId ?? defaultVenueId(req.user);
  if (!venueId) throw notFound('Venue');
  assertVenueAccess(req.user, venueId);

  const venue = one('SELECT id, name, opens_at, closes_at FROM venues WHERE id = ?', venueId);
  if (!venue) throw notFound('Venue');

  const resources = all(
    `SELECT r.id, r.name, r.capacity, r.slot_minutes, r.price_per_slot, r.peak_price, r.is_active,
            a.name AS activity, a.icon, a.color
       FROM resources r JOIN activities a ON a.id = r.activity_id
      WHERE r.venue_id = ? AND r.is_active = 1
      ORDER BY a.sort_order, r.name`,
    venueId,
  );

  const bookings = all(
    `${BOOKING_SELECT} WHERE v.id = ? AND b.date = ? AND b.status != 'cancelled' ORDER BY b.start_time`,
    venueId,
    q.date,
  ).map((r) => withVerdict(req.user, shapeBooking(r)));

  const blocks = all(
    `SELECT bl.id, bl.resource_id AS resourceId, bl.start_time AS start, bl.end_time AS end, bl.reason
       FROM blocks bl JOIN resources r ON r.id = bl.resource_id
      WHERE r.venue_id = ? AND bl.date = ?`,
    venueId,
    q.date,
  );

  res.json({
    date: q.date,
    venue: { id: venue.id, name: venue.name, opensAt: venue.opens_at, closesAt: venue.closes_at },
    resources: resources.map((r) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      slotMinutes: r.slot_minutes,
      price: r.price_per_slot,
      peakPrice: r.peak_price,
      activity: { name: r.activity, icon: r.icon, color: r.color },
    })),
    bookings,
    blocks,
  });
});

const listQuery = z.object({
  venueId: z.coerce.number().int().positive().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  status: z.enum(['confirmed', 'checked_in', 'completed', 'cancelled', 'no_show']).optional(),
  payment: z.enum(['unpaid', 'paid', 'refunded']).optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const PAGE_SIZE = 25;

router.get('/bookings', (req, res) => {
  const f = listQuery.parse(req.query);
  const scope = venueFilter(req.user);
  const where = [scope.sql];
  const params = [...scope.params];

  if (f.venueId) where.push('v.id = ?'), params.push(f.venueId);
  if (f.from) where.push('b.date >= ?'), params.push(f.from);
  if (f.to) where.push('b.date <= ?'), params.push(f.to);
  if (f.status) where.push('b.status = ?'), params.push(f.status);
  if (f.payment) where.push('b.payment_status = ?'), params.push(f.payment);
  if (f.q) {
    where.push('(b.code LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR b.guest_name LIKE ? OR u.phone LIKE ? OR b.guest_phone LIKE ?)');
    const like = `%${f.q}%`;
    params.push(like, like, like, like, like, like);
  }

  const clause = where.join(' AND ');
  const { total, amount } = one(
    `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.amount END), 0) AS amount
       FROM bookings b JOIN resources r ON r.id = b.resource_id JOIN venues v ON v.id = r.venue_id
       LEFT JOIN users u ON u.id = b.user_id
      WHERE ${clause}`,
    ...params,
  );
  const rows = all(
    `${BOOKING_SELECT} WHERE ${clause} ORDER BY b.date DESC, b.start_time DESC LIMIT ? OFFSET ?`,
    ...params,
    PAGE_SIZE,
    (f.page - 1) * PAGE_SIZE,
  );

  res.json({
    total,
    paidAmount: amount,
    page: f.page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    items: rows.map((r) => withVerdict(req.user, shapeBooking(r))),
  });
});

router.get('/bookings/:code', (req, res) => {
  const booking = findBooking('b.code = ?', req.params.code.toUpperCase());
  if (!booking) throw notFound('Booking');
  assertVenueAccess(req.user, booking.venue.id);
  res.json(withVerdict(req.user, booking));
});

const walkInBody = z.object({
  resourceId: z.number().int().positive(),
  date: z.iso.date(),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  slotCount: z.number().int().min(1).max(config.maxSlotsPerBooking).default(1),
  players: z.number().int().min(1).max(50).default(1),
  customerId: z.number().int().positive().optional(),
  guestName: z.string().trim().max(60).optional(),
  guestPhone: z.string().trim().max(20).optional(),
  paymentMethod: z.enum(['wallet', 'venue']).default('venue'),
  markPaid: z.boolean().default(false),
  note: z.string().trim().max(200).optional(),
});

router.post('/bookings', (req, res) => {
  const booking = createBooking(req.user, walkInBody.parse(req.body));
  res.status(201).json(withVerdict(req.user, booking));
});

const patchBody = z.object({
  status: z.enum(['checked_in', 'completed', 'no_show']).optional(),
  paymentStatus: z.literal('paid').optional(),
});

router.patch('/bookings/:id', (req, res) => {
  const booking = updateBooking(req.user, Number(req.params.id), patchBody.parse(req.body));
  res.json(withVerdict(req.user, booking));
});

router.post('/bookings/:id/cancel', (req, res) => {
  const { reason } = z.object({ reason: z.string().trim().max(200).optional() }).parse(req.body ?? {});
  res.json(withVerdict(req.user, cancelBooking(req.user, Number(req.params.id), reason)));
});

/** Player lookup for walk-ins and wallet top-ups. */
router.get('/players', (req, res) => {
  const q = z.string().trim().min(2).safeParse(req.query.q);
  if (!q.success) return res.json([]);
  const like = `%${q.data}%`;
  res.json(
    all(
      `SELECT id, name, email, phone, wallet_balance AS wallet FROM users
        WHERE role = 'player' AND is_active = 1 AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
        ORDER BY name LIMIT 8`,
      like,
      like,
      like,
    ),
  );
});

router.get('/players/:id/wallet', (req, res) => {
  const player = one("SELECT id, name, email, phone, wallet_balance FROM users WHERE id = ? AND role = 'player'", req.params.id);
  if (!player) throw notFound('Player');
  res.json({
    player: { id: player.id, name: player.name, email: player.email, phone: player.phone },
    balance: player.wallet_balance,
    transactions: ledger(player.id, 30),
  });
});

const topUpBody = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int().min(50, 'Minimum top-up is ₹50').max(20000, 'Maximum top-up is ₹20,000'),
  note: z.string().trim().max(120).optional(),
});

router.post('/wallet/topup', (req, res) => {
  const body = topUpBody.parse(req.body);
  const player = one("SELECT id FROM users WHERE id = ? AND role = 'player' AND is_active = 1", body.userId);
  if (!player) throw notFound('Player');

  const balance = moveFunds({
    userId: body.userId,
    amount: body.amount,
    kind: 'topup',
    note: body.note || 'Counter top-up',
    actorId: req.user.id,
  });
  record(req.user.id, 'wallet.topup', 'user', body.userId, { amount: body.amount });
  res.status(201).json({ balance });
});

const adjustBody = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int().refine((n) => n !== 0, 'Amount can’t be zero'),
  note: z.string().trim().min(3, 'Say why').max(120),
});

router.post('/wallet/adjust', requireRole('manager'), (req, res) => {
  const body = adjustBody.parse(req.body);
  if (!one("SELECT 1 FROM users WHERE id = ? AND role = 'player'", body.userId)) throw badRequest('Not a player account');
  const balance = moveFunds({ ...body, kind: 'adjustment', actorId: req.user.id });
  record(req.user.id, 'wallet.adjust', 'user', body.userId, { amount: body.amount, note: body.note });
  res.json({ balance });
});

export default router;
