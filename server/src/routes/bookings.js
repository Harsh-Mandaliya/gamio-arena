import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { all } from '../db/index.js';
import { requireUser } from '../http/auth.js';
import { notFound } from '../http/errors.js';
import { isoDate } from '../lib/time.js';
import {
  BOOKING_SELECT,
  assertCanView,
  cancelBooking,
  cancelVerdict,
  createBooking,
  findBooking,
  shapeBooking,
} from '../services/bookings.js';
import { ledger } from '../services/wallet.js';

const router = Router();
router.use(requireUser);

const withVerdict = (viewer, booking) => ({ ...booking, cancel: cancelVerdict(viewer, booking) });

router.get('/bookings', (req, res) => {
  const today = isoDate();
  const rows = all(`${BOOKING_SELECT} WHERE b.user_id = ? ORDER BY b.date DESC, b.start_time DESC`, req.user.id);
  const bookings = rows.map((r) => withVerdict(req.user, shapeBooking(r)));

  res.json({
    upcoming: bookings
      .filter((b) => b.date >= today && ['confirmed', 'checked_in'].includes(b.status))
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    past: bookings.filter((b) => !(b.date >= today && ['confirmed', 'checked_in'].includes(b.status))),
  });
});

const createBody = z.object({
  resourceId: z.number().int().positive(),
  date: z.iso.date(),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  slotCount: z.number().int().min(1).max(config.maxSlotsPerBooking).default(1),
  players: z.number().int().min(1).max(50).default(1),
  paymentMethod: z.enum(['wallet', 'venue']).default('venue'),
  note: z.string().trim().max(200).optional(),
});

router.post('/bookings', (req, res) => {
  const body = createBody.parse(req.body);
  // Staff booking for themselves still goes through the player flow.
  const actor = { ...req.user, role: 'player' };
  const booking = createBooking(actor, body);
  res.status(201).json(withVerdict(req.user, booking));
});

router.get('/bookings/:code', (req, res) => {
  const booking = findBooking('b.code = ?', req.params.code.toUpperCase());
  if (!booking) throw notFound('Booking');
  assertCanView(req.user, booking);
  res.json(withVerdict(req.user, booking));
});

const cancelBody = z.object({ reason: z.string().trim().max(200).optional() });

router.post('/bookings/:code/cancel', (req, res) => {
  const { reason } = cancelBody.parse(req.body ?? {});
  const booking = findBooking('b.code = ?', req.params.code.toUpperCase());
  if (!booking || booking.customer.id !== req.user.id) throw notFound('Booking');
  const updated = cancelBooking({ ...req.user, role: 'player' }, booking.id, reason);
  res.json(withVerdict(req.user, updated));
});

router.get('/wallet', (req, res) => {
  res.json({ balance: req.user.wallet_balance, transactions: ledger(req.user.id) });
});

export default router;
