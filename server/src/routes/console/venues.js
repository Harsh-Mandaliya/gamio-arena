import { Router } from 'express';
import { z } from 'zod';
import { all, one, run } from '../../db/index.js';
import { requireRole } from '../../http/auth.js';
import { badRequest, conflict, forbidden, notFound } from '../../http/errors.js';
import { slugify } from '../../lib/codes.js';
import { isoDate, overlaps, toMinutes } from '../../lib/time.js';
import { record } from '../../services/audit.js';
import { assertVenueAccess, venueFilter } from '../../services/scope.js';

const router = Router();
router.use(requireRole('manager'));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24h HH:MM');
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #12684f');

function shapeResource(r) {
  return {
    id: r.id,
    venueId: r.venue_id,
    name: r.name,
    capacity: r.capacity,
    slotMinutes: r.slot_minutes,
    price: r.price_per_slot,
    peakPrice: r.peak_price,
    notes: r.notes,
    isActive: Boolean(r.is_active),
    activity: { id: r.activity_id, name: r.activity_name, icon: r.icon, color: r.color },
  };
}

router.get('/venues', (req, res) => {
  const scope = venueFilter(req.user);
  const venues = all(
    `SELECT v.*, m.name AS manager_name FROM venues v LEFT JOIN users m ON m.id = v.manager_id
      WHERE ${scope.sql} ORDER BY v.city, v.name`,
    ...scope.params,
  );
  const ids = venues.map((v) => v.id);
  const resources = ids.length
    ? all(
        `SELECT r.*, a.name AS activity_name, a.icon, a.color FROM resources r JOIN activities a ON a.id = r.activity_id
          WHERE r.venue_id IN (${ids.map(() => '?').join(',')}) ORDER BY a.sort_order, r.name`,
        ...ids,
      )
    : [];
  const staff = ids.length
    ? all(
        `SELECT id, name, email, venue_id FROM users WHERE role = 'staff' AND venue_id IN (${ids.map(() => '?').join(',')})`,
        ...ids,
      )
    : [];

  res.json(
    venues.map((v) => ({
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
      manager: v.manager_id ? { id: v.manager_id, name: v.manager_name } : null,
      resources: resources.filter((r) => r.venue_id === v.id).map(shapeResource),
      staff: staff.filter((s) => s.venue_id === v.id).map(({ venue_id, ...s }) => s),
    })),
  );
});

const venueFields = {
  tagline: z.string().trim().max(80).optional(),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().min(5).max(160),
  phone: z.string().trim().max(20).optional(),
  opensAt: time,
  closesAt: time,
  accent: hex,
};
const adminVenueFields = {
  name: z.string().trim().min(3).max(60),
  city: z.string().trim().min(2).max(40),
  managerId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
};

const createVenue = z.object({ ...venueFields, ...adminVenueFields });
const updateVenue = z.object({ ...venueFields, ...adminVenueFields }).partial();

function checkHours(opensAt, closesAt) {
  if (opensAt && closesAt && toMinutes(closesAt) - toMinutes(opensAt) < 60) {
    throw badRequest('Venue must be open at least an hour', { closesAt: 'Closes before it opens' });
  }
}

function checkManager(managerId) {
  if (managerId && !one("SELECT 1 FROM users WHERE id = ? AND role IN ('manager', 'admin')", managerId)) {
    throw badRequest('Pick a manager account', { managerId: 'Not a manager' });
  }
}

router.post('/venues', requireRole('admin'), (req, res) => {
  const v = createVenue.parse(req.body);
  checkHours(v.opensAt, v.closesAt);
  checkManager(v.managerId);

  let slug = slugify(v.name);
  if (one('SELECT 1 FROM venues WHERE slug = ?', slug)) slug = `${slug}-${slugify(v.city)}`;

  const { lastInsertRowid: id } = run(
    `INSERT INTO venues (name, slug, tagline, description, address, city, phone, opens_at, closes_at, accent, manager_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    v.name,
    slug,
    v.tagline ?? null,
    v.description ?? null,
    v.address,
    v.city,
    v.phone ?? null,
    v.opensAt,
    v.closesAt,
    v.accent,
    v.managerId ?? null,
  );
  record(req.user.id, 'venue.create', 'venue', Number(id), { name: v.name });
  res.status(201).json({ id: Number(id), slug });
});

const COLUMNS = {
  tagline: 'tagline',
  description: 'description',
  address: 'address',
  phone: 'phone',
  opensAt: 'opens_at',
  closesAt: 'closes_at',
  accent: 'accent',
  name: 'name',
  city: 'city',
  managerId: 'manager_id',
  isActive: 'is_active',
};

router.patch('/venues/:id', (req, res) => {
  const id = Number(req.params.id);
  assertVenueAccess(req.user, id);
  const current = one('SELECT * FROM venues WHERE id = ?', id);
  if (!current) throw notFound('Venue');

  const body = updateVenue.parse(req.body);
  if (req.user.role !== 'admin' && Object.keys(adminVenueFields).some((k) => k in body)) {
    throw forbidden('Only admins can rename, move, reassign or pause a venue');
  }
  checkHours(body.opensAt ?? current.opens_at, body.closesAt ?? current.closes_at);
  checkManager(body.managerId);

  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(body)) {
    sets.push(`${COLUMNS[key]} = ?`);
    params.push(typeof value === 'boolean' ? Number(value) : (value ?? null));
  }
  if (sets.length) run(`UPDATE venues SET ${sets.join(', ')} WHERE id = ?`, ...params, id);
  record(req.user.id, 'venue.update', 'venue', id, Object.keys(body));
  res.json({ ok: true });
});

const resourceBody = z.object({
  activityId: z.number().int().positive(),
  name: z.string().trim().min(2).max(40),
  capacity: z.number().int().min(1).max(30),
  slotMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90), z.literal(120)]),
  price: z.number().int().min(0).max(100000),
  peakPrice: z.number().int().min(0).max(100000).nullable().optional(),
  notes: z.string().trim().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
});

function checkActivity(activityId) {
  if (activityId && !one('SELECT 1 FROM activities WHERE id = ?', activityId)) throw badRequest('Unknown game type');
}

router.post('/venues/:id/resources', (req, res) => {
  const venueId = Number(req.params.id);
  assertVenueAccess(req.user, venueId);
  const r = resourceBody.parse(req.body);
  checkActivity(r.activityId);

  const { lastInsertRowid: id } = run(
    `INSERT INTO resources (venue_id, activity_id, name, capacity, slot_minutes, price_per_slot, peak_price, notes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    venueId,
    r.activityId,
    r.name,
    r.capacity,
    r.slotMinutes,
    r.price,
    r.peakPrice ?? null,
    r.notes ?? null,
    r.isActive === false ? 0 : 1,
  );
  record(req.user.id, 'resource.create', 'resource', Number(id), { name: r.name, venueId });
  res.status(201).json({ id: Number(id) });
});

function loadOwnedResource(user, id) {
  const r = one('SELECT * FROM resources WHERE id = ?', id);
  if (!r) throw notFound('Table or court');
  assertVenueAccess(user, r.venue_id);
  return r;
}

router.patch('/resources/:id', (req, res) => {
  const current = loadOwnedResource(req.user, Number(req.params.id));
  const r = resourceBody.partial().parse(req.body);
  checkActivity(r.activityId);

  if (r.slotMinutes && r.slotMinutes !== current.slot_minutes) {
    const upcoming = one(
      "SELECT COUNT(*) AS n FROM bookings WHERE resource_id = ? AND date >= ? AND status = 'confirmed'",
      current.id,
      isoDate(),
    ).n;
    if (upcoming) throw conflict(`Slot length can’t change while ${upcoming} upcoming bookings exist`);
  }

  run(
    `UPDATE resources SET activity_id = ?, name = ?, capacity = ?, slot_minutes = ?, price_per_slot = ?,
            peak_price = ?, notes = ?, is_active = ? WHERE id = ?`,
    r.activityId ?? current.activity_id,
    r.name ?? current.name,
    r.capacity ?? current.capacity,
    r.slotMinutes ?? current.slot_minutes,
    r.price ?? current.price_per_slot,
    r.peakPrice === undefined ? current.peak_price : r.peakPrice,
    r.notes === undefined ? current.notes : r.notes,
    r.isActive === undefined ? current.is_active : Number(r.isActive),
    current.id,
  );
  record(req.user.id, 'resource.update', 'resource', current.id, Object.keys(r));
  res.json({ ok: true });
});

router.delete('/resources/:id', (req, res) => {
  const r = loadOwnedResource(req.user, Number(req.params.id));
  const used = one('SELECT COUNT(*) AS n FROM bookings WHERE resource_id = ?', r.id).n;
  if (used) {
    // Keep history intact; just take it off the floor.
    run('UPDATE resources SET is_active = 0 WHERE id = ?', r.id);
    record(req.user.id, 'resource.retire', 'resource', r.id, { name: r.name });
    return res.json({ retired: true });
  }
  run('DELETE FROM resources WHERE id = ?', r.id);
  record(req.user.id, 'resource.delete', 'resource', r.id, { name: r.name });
  res.json({ deleted: true });
});

router.get('/venues/:id/blocks', (req, res) => {
  const venueId = Number(req.params.id);
  assertVenueAccess(req.user, venueId);
  res.json(
    all(
      `SELECT bl.id, bl.date, bl.start_time AS start, bl.end_time AS end, bl.reason,
              r.id AS resourceId, r.name AS resource
         FROM blocks bl JOIN resources r ON r.id = bl.resource_id
        WHERE r.venue_id = ? AND bl.date >= ?
        ORDER BY bl.date, bl.start_time`,
      venueId,
      isoDate(),
    ),
  );
});

const blockBody = z.object({
  resourceId: z.number().int().positive(),
  date: z.iso.date(),
  start: time,
  end: time,
  reason: z.string().trim().min(3, 'Add a short reason').max(80),
});

router.post('/blocks', (req, res) => {
  const b = blockBody.parse(req.body);
  const resource = loadOwnedResource(req.user, b.resourceId);
  if (toMinutes(b.end) <= toMinutes(b.start)) throw badRequest('End must be after start', { end: 'Before start' });

  const clash = all(
    "SELECT code, start_time, end_time FROM bookings WHERE resource_id = ? AND date = ? AND status != 'cancelled'",
    resource.id,
    b.date,
  ).find((x) => overlaps(toMinutes(b.start), toMinutes(b.end), toMinutes(x.start_time), toMinutes(x.end_time)));
  if (clash) throw conflict(`Booking ${clash.code} (${clash.start_time}) sits in that window. Cancel or move it first.`);

  const { lastInsertRowid: id } = run(
    'INSERT INTO blocks (resource_id, date, start_time, end_time, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    resource.id,
    b.date,
    b.start,
    b.end,
    b.reason,
    req.user.id,
  );
  record(req.user.id, 'block.create', 'resource', resource.id, b);
  res.status(201).json({ id: Number(id) });
});

router.delete('/blocks/:id', (req, res) => {
  const block = one('SELECT bl.*, r.venue_id FROM blocks bl JOIN resources r ON r.id = bl.resource_id WHERE bl.id = ?', req.params.id);
  if (!block) throw notFound('Block');
  assertVenueAccess(req.user, block.venue_id);
  run('DELETE FROM blocks WHERE id = ?', block.id);
  record(req.user.id, 'block.delete', 'resource', block.resource_id);
  res.json({ ok: true });
});

export default router;
