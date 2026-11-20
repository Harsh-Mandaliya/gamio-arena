import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { all, one } from '../db/index.js';
import { notFound } from '../http/errors.js';
import { slotsFor } from '../services/bookings.js';
import { addDays, isoDate, minutesNow, toMinutes } from '../lib/time.js';

const router = Router();

export function shapeActivity(a) {
  return { id: a.id, name: a.name, slug: a.slug, icon: a.icon, color: a.color, blurb: a.blurb };
}

function isOpenNow(venue, now = new Date()) {
  const m = minutesNow(now);
  return toMinutes(venue.opens_at) <= m && m < toMinutes(venue.closes_at);
}

function activitiesByVenue() {
  const rows = all(
    `SELECT DISTINCT r.venue_id, a.id, a.name, a.slug, a.icon, a.color, a.blurb, a.sort_order
       FROM resources r JOIN activities a ON a.id = r.activity_id
      WHERE r.is_active = 1
      ORDER BY a.sort_order`,
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.venue_id)) map.set(row.venue_id, []);
    map.get(row.venue_id).push(shapeActivity(row));
  }
  return map;
}

export function shapeVenue(v, activities = []) {
  return {
    id: v.id,
    name: v.name,
    slug: v.slug,
    tagline: v.tagline,
    description: v.description,
    address: v.address,
    city: v.city,
    phone: v.phone,
    opensAt: v.opens_at,
    closesAt: v.closes_at,
    accent: v.accent,
    isActive: Boolean(v.is_active),
    openNow: isOpenNow(v),
    activities,
    resourceCount: v.resource_count ?? undefined,
    fromPrice: v.from_price ?? undefined,
  };
}

router.get('/meta', (req, res) => {
  res.json({
    demoMode: config.demoMode,
    cancelWindowHours: config.cancelWindowHours,
    horizonDays: config.bookingHorizonDays,
    maxSlotsPerBooking: config.maxSlotsPerBooking,
    today: isoDate(),
    cities: all('SELECT DISTINCT city FROM venues WHERE is_active = 1 ORDER BY city').map((r) => r.city),
  });
});

router.get('/activities', (req, res) => {
  const rows = all(
    `SELECT a.*, COUNT(r.id) AS resource_count, COUNT(DISTINCT r.venue_id) AS venue_count,
            MIN(r.price_per_slot) AS from_price
       FROM activities a
       LEFT JOIN resources r ON r.activity_id = a.id AND r.is_active = 1
       LEFT JOIN venues v ON v.id = r.venue_id AND v.is_active = 1
      GROUP BY a.id
      ORDER BY a.sort_order, a.name`,
  );
  res.json(
    rows.map((a) => ({
      ...shapeActivity(a),
      resourceCount: a.resource_count,
      venueCount: a.venue_count,
      fromPrice: a.from_price,
    })),
  );
});

const venueQuery = z.object({
  activity: z.string().optional(),
  city: z.string().optional(),
  q: z.string().trim().optional(),
});

router.get('/venues', (req, res) => {
  const { activity, city, q } = venueQuery.parse(req.query);
  const where = ['v.is_active = 1'];
  const params = [];

  if (city) {
    where.push('v.city = ?');
    params.push(city);
  }
  if (q) {
    where.push('(v.name LIKE ? OR v.address LIKE ? OR v.city LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (activity) {
    where.push(
      `EXISTS (SELECT 1 FROM resources r2 JOIN activities a2 ON a2.id = r2.activity_id
                WHERE r2.venue_id = v.id AND r2.is_active = 1 AND a2.slug = ?)`,
    );
    params.push(activity);
  }

  const rows = all(
    `SELECT v.*, COUNT(r.id) AS resource_count, MIN(r.price_per_slot) AS from_price
       FROM venues v
       LEFT JOIN resources r ON r.venue_id = v.id AND r.is_active = 1
      WHERE ${where.join(' AND ')}
      GROUP BY v.id
      ORDER BY v.city, v.name`,
    ...params,
  );
  const acts = activitiesByVenue();
  res.json(rows.map((v) => shapeVenue(v, acts.get(v.id) ?? [])));
});

router.get('/venues/:slug', (req, res) => {
  const venue = one('SELECT * FROM venues WHERE slug = ? AND is_active = 1', req.params.slug);
  if (!venue) throw notFound('Venue');

  const resources = all(
    `SELECT r.*, a.name AS activity_name, a.slug AS activity_slug, a.icon, a.color
       FROM resources r JOIN activities a ON a.id = r.activity_id
      WHERE r.venue_id = ? AND r.is_active = 1
      ORDER BY a.sort_order, r.name`,
    venue.id,
  );

  res.json({
    ...shapeVenue(venue, activitiesByVenue().get(venue.id) ?? []),
    resources: resources.map((r) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      slotMinutes: r.slot_minutes,
      price: r.price_per_slot,
      peakPrice: r.peak_price,
      notes: r.notes,
      activity: { id: r.activity_id, name: r.activity_name, slug: r.activity_slug, icon: r.icon, color: r.color },
    })),
  });
});

const dateParam = z.object({ date: z.iso.date().default(() => isoDate()) });

router.get('/resources/:id/slots', (req, res) => {
  const { date } = dateParam.parse(req.query);
  const { resource, slots } = slotsFor(Number(req.params.id), date);
  if (!resource.is_active || !resource.venue_active) throw notFound('Table or court');
  // Public view: hide which booking holds a slot and why a block exists.
  res.json({
    date,
    slots: slots.map(({ bookingId, reason, ...s }) => s),
  });
});

/** Powers the home page: headline numbers and the "next free" board. */
router.get('/highlights', (req, res) => {
  const now = new Date();
  const today = isoDate(now);

  const stats = one(
    `SELECT (SELECT COUNT(*) FROM venues WHERE is_active = 1) AS venues,
            (SELECT COUNT(*) FROM resources WHERE is_active = 1) AS resources,
            (SELECT COUNT(*) FROM activities) AS activities,
            (SELECT COUNT(*) FROM bookings WHERE status != 'cancelled' AND date BETWEEN ? AND ?) AS bookings_week`,
    addDays(today, -6),
    today,
  );

  const resources = all(
    `SELECT r.id, r.name, a.name AS activity, a.slug AS activity_slug, a.icon, a.color,
            v.name AS venue, v.slug AS venue_slug
       FROM resources r
       JOIN activities a ON a.id = r.activity_id
       JOIN venues v ON v.id = r.venue_id AND v.is_active = 1
      WHERE r.is_active = 1
      ORDER BY a.sort_order, r.id`,
  );

  // First open slot per activity, looking at today then tomorrow.
  const seen = new Set();
  const board = [];
  for (const date of [today, addDays(today, 1)]) {
    for (const r of resources) {
      if (seen.has(r.activity_slug)) continue;
      const next = slotsFor(r.id, date, now).slots.find((s) => s.state === 'open');
      if (!next) continue;
      seen.add(r.activity_slug);
      board.push({
        resourceId: r.id,
        resource: r.name,
        activity: { name: r.activity, slug: r.activity_slug, icon: r.icon, color: r.color },
        venue: { name: r.venue, slug: r.venue_slug },
        date,
        start: next.start,
        price: next.price,
      });
    }
  }

  board.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  res.json({
    stats: {
      venues: stats.venues,
      resources: stats.resources,
      activities: stats.activities,
      bookingsThisWeek: stats.bookings_week,
    },
    nextOpen: board.slice(0, 7),
  });
});

export default router;
