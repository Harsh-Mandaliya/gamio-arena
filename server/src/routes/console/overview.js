import { Router } from 'express';
import { z } from 'zod';
import { all, one } from '../../db/index.js';
import { addDays, isoDate, minutesNow, toMinutes } from '../../lib/time.js';
import { BOOKING_SELECT, shapeBooking } from '../../services/bookings.js';
import { assertVenueAccess, venueFilter } from '../../services/scope.js';

const router = Router();

const query = z.object({ venueId: z.coerce.number().int().positive().optional() });

router.get('/overview', (req, res) => {
  const { venueId } = query.parse(req.query);
  if (venueId) assertVenueAccess(req.user, venueId);

  const scope = venueId ? { sql: 'v.id = ?', params: [venueId] } : venueFilter(req.user);
  const now = new Date();
  const today = isoDate(now);
  const monthStart = today.slice(0, 8) + '01';
  const prevMonthStart = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const sameDayLastMonth = addDays(prevMonthStart, Number(today.slice(8)) - 1);

  const base = `FROM bookings b
                JOIN resources r ON r.id = b.resource_id
                JOIN activities a ON a.id = r.activity_id
                JOIN venues v ON v.id = r.venue_id
               WHERE ${scope.sql}`;
  const p = scope.params;

  const todayStats = one(
    `SELECT COUNT(*) AS bookings,
            SUM(b.status = 'checked_in') AS checked_in,
            SUM(b.status = 'completed') AS completed,
            COALESCE(SUM(CASE WHEN b.payment_status = 'unpaid' THEN b.amount END), 0) AS due
       ${base} AND b.date = ? AND b.status != 'cancelled'`,
    ...p,
    today,
  );

  const revenue = (from, to) =>
    one(
      `SELECT COALESCE(SUM(b.amount), 0) AS total ${base}
         AND b.payment_status = 'paid' AND b.date BETWEEN ? AND ?`,
      ...p,
      from,
      to,
    ).total;

  // Utilisation: share of today's bookable minutes that are taken.
  const resources = all(
    `SELECT r.id, v.opens_at, v.closes_at FROM resources r JOIN venues v ON v.id = r.venue_id
      WHERE r.is_active = 1 AND v.is_active = 1 AND ${scope.sql}`,
    ...p,
  );
  const capacity = resources.reduce((sum, r) => sum + toMinutes(r.closes_at) - toMinutes(r.opens_at), 0);
  const booked = all(
    `SELECT b.start_time, b.end_time ${base} AND b.date = ? AND b.status != 'cancelled'`,
    ...p,
    today,
  ).reduce((sum, b) => sum + toMinutes(b.end_time) - toMinutes(b.start_time), 0);

  const from14 = addDays(today, -13);
  const dailyRows = all(
    `SELECT b.date, COUNT(*) AS bookings,
            COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.amount END), 0) AS revenue
       ${base} AND b.status != 'cancelled' AND b.date BETWEEN ? AND ?
      GROUP BY b.date`,
    ...p,
    from14,
    today,
  );
  const daily = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(from14, i);
    const row = dailyRows.find((d) => d.date === date);
    return { date, bookings: row?.bookings ?? 0, revenue: row?.revenue ?? 0 };
  });

  const from30 = addDays(today, -29);
  const byActivity = all(
    `SELECT a.name, a.color, a.icon, COUNT(*) AS bookings,
            COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.amount END), 0) AS revenue
       ${base} AND b.status != 'cancelled' AND b.date BETWEEN ? AND ?
      GROUP BY a.id ORDER BY bookings DESC`,
    ...p,
    from30,
    today,
  );

  const topResources = all(
    `SELECT r.name, v.name AS venue, a.color, COUNT(*) AS bookings
       ${base} AND b.status != 'cancelled' AND b.date BETWEEN ? AND ?
      GROUP BY r.id ORDER BY bookings DESC LIMIT 5`,
    ...p,
    from30,
    today,
  );

  const nowTime = `${String(Math.floor(minutesNow(now) / 60)).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const upNext = all(
    `${BOOKING_SELECT}
      WHERE ${scope.sql} AND b.status = 'confirmed'
        AND (b.date > ? OR (b.date = ? AND b.end_time > ?))
      ORDER BY b.date, b.start_time LIMIT 6`,
    ...p,
    today,
    today,
    nowTime,
  ).map(shapeBooking);

  const extras =
    req.user.role === 'admin'
      ? {
          people: Object.fromEntries(
            all('SELECT role, COUNT(*) AS n FROM users WHERE is_active = 1 GROUP BY role').map((r) => [r.role, r.n]),
          ),
          newEnquiries: one("SELECT COUNT(*) AS n FROM enquiries WHERE status = 'new'").n,
        }
      : {};

  res.json({
    today: {
      bookings: todayStats.bookings,
      checkedIn: todayStats.checked_in ?? 0,
      completed: todayStats.completed ?? 0,
      due: todayStats.due,
      utilisation: capacity ? Math.round((booked / capacity) * 100) : 0,
    },
    revenue: {
      month: revenue(monthStart, today),
      lastMonthToDate: revenue(prevMonthStart, sameDayLastMonth),
    },
    daily,
    byActivity,
    topResources,
    upNext,
    ...extras,
  });
});

export default router;
