import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { all, one, run } from '../../db/index.js';
import { requireRole } from '../../http/auth.js';
import { badRequest, conflict, notFound } from '../../http/errors.js';
import { slugify } from '../../lib/codes.js';
import { record } from '../../services/audit.js';

const router = Router();
router.use(requireRole('admin'));

const ROLES = ['admin', 'manager', 'staff', 'player'];

router.get('/users', (req, res) => {
  const { role, q } = z
    .object({ role: z.enum(ROLES).optional(), q: z.string().trim().optional() })
    .parse(req.query);

  const where = ['1'];
  const params = [];
  if (role) where.push('u.role = ?'), params.push(role);
  if (q) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const rows = all(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.venue_id, u.wallet_balance, u.is_active,
            u.created_at, u.last_login_at, v.name AS venue_name,
            (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) AS bookings,
            (SELECT GROUP_CONCAT(name, ', ') FROM venues WHERE manager_id = u.id) AS manages
       FROM users u LEFT JOIN venues v ON v.id = u.venue_id
      WHERE ${where.join(' AND ')}
      ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'manager' THEN 1 WHEN 'staff' THEN 2 ELSE 3 END, u.name`,
    ...params,
  );

  res.json(
    rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      venue: u.venue_id ? { id: u.venue_id, name: u.venue_name } : null,
      manages: u.manages,
      wallet: u.wallet_balance,
      isActive: Boolean(u.is_active),
      bookings: u.bookings,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
    })),
  );
});

const userBody = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email().transform((e) => e.toLowerCase()),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(ROLES),
  venueId: z.number().int().positive().nullable().optional(),
  password: z.string().min(8, 'Use at least 8 characters').max(72),
});

function checkStaffVenue(role, venueId) {
  if (role === 'staff' && !venueId) throw badRequest('Staff need a home venue', { venueId: 'Pick a venue' });
  if (venueId && !one('SELECT 1 FROM venues WHERE id = ?', venueId)) throw badRequest('Unknown venue');
}

router.post('/users', async (req, res) => {
  const u = userBody.parse(req.body);
  checkStaffVenue(u.role, u.venueId);
  if (one('SELECT 1 FROM users WHERE email = ?', u.email)) throw conflict('That email is already registered');

  const { lastInsertRowid: id } = run(
    'INSERT INTO users (name, email, phone, role, venue_id, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    u.name,
    u.email,
    u.phone || null,
    u.role,
    u.role === 'staff' ? u.venueId : null,
    await bcrypt.hash(u.password, 10),
  );
  record(req.user.id, 'user.create', 'user', Number(id), { role: u.role });
  res.status(201).json({ id: Number(id) });
});

const patchUser = z.object({
  role: z.enum(ROLES).optional(),
  venueId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Use at least 8 characters').max(72).optional(),
});

router.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const current = one('SELECT * FROM users WHERE id = ?', id);
  if (!current) throw notFound('User');

  const body = patchUser.parse(req.body);
  if (id === req.user.id && (body.role && body.role !== 'admin' || body.isActive === false)) {
    throw conflict("You can't demote or pause your own account");
  }

  const role = body.role ?? current.role;
  const venueId = body.venueId === undefined ? current.venue_id : body.venueId;
  checkStaffVenue(role, venueId);

  run(
    'UPDATE users SET role = ?, venue_id = ?, is_active = ? WHERE id = ?',
    role,
    role === 'staff' ? venueId : null,
    body.isActive === undefined ? current.is_active : Number(body.isActive),
    id,
  );
  if (current.role === 'manager' && role !== 'manager' && role !== 'admin') {
    run('UPDATE venues SET manager_id = NULL WHERE manager_id = ?', id);
  }
  if (body.password) {
    run('UPDATE users SET password_hash = ? WHERE id = ?', await bcrypt.hash(body.password, 10), id);
  }

  record(req.user.id, 'user.update', 'user', id, { ...body, password: body.password ? 'reset' : undefined });
  res.json({ ok: true });
});

const activityBody = z.object({
  name: z.string().trim().min(2).max(40),
  icon: z.string().trim().min(2).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  blurb: z.string().trim().max(160).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

router.post('/activities', (req, res) => {
  const a = activityBody.parse(req.body);
  const { lastInsertRowid: id } = run(
    'INSERT INTO activities (name, slug, icon, color, blurb, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    a.name,
    slugify(a.name),
    a.icon,
    a.color,
    a.blurb ?? null,
    a.sortOrder ?? 100,
  );
  record(req.user.id, 'activity.create', 'activity', Number(id), { name: a.name });
  res.status(201).json({ id: Number(id) });
});

router.patch('/activities/:id', (req, res) => {
  const current = one('SELECT * FROM activities WHERE id = ?', req.params.id);
  if (!current) throw notFound('Game type');
  const a = activityBody.partial().parse(req.body);
  run(
    'UPDATE activities SET name = ?, slug = ?, icon = ?, color = ?, blurb = ?, sort_order = ? WHERE id = ?',
    a.name ?? current.name,
    a.name ? slugify(a.name) : current.slug,
    a.icon ?? current.icon,
    a.color ?? current.color,
    a.blurb ?? current.blurb,
    a.sortOrder ?? current.sort_order,
    current.id,
  );
  record(req.user.id, 'activity.update', 'activity', current.id, Object.keys(a));
  res.json({ ok: true });
});

router.delete('/activities/:id', (req, res) => {
  const used = one('SELECT COUNT(*) AS n FROM resources WHERE activity_id = ?', req.params.id).n;
  if (used) throw conflict(`${used} tables or courts still use this game type`);
  run('DELETE FROM activities WHERE id = ?', req.params.id);
  record(req.user.id, 'activity.delete', 'activity', Number(req.params.id));
  res.json({ ok: true });
});

router.get('/enquiries', (req, res) => {
  res.json(
    all(
      `SELECT id, name, email, topic, message, status, created_at AS createdAt FROM enquiries
        ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, id DESC`,
    ),
  );
});

router.patch('/enquiries/:id', (req, res) => {
  const { status } = z.object({ status: z.enum(['new', 'in_progress', 'closed']) }).parse(req.body);
  const { changes } = run('UPDATE enquiries SET status = ? WHERE id = ?', status, req.params.id);
  if (!changes) throw notFound('Enquiry');
  res.json({ ok: true });
});

router.get('/audit', (req, res) => {
  res.json(
    all(
      `SELECT l.id, l.action, l.entity, l.entity_id AS entityId, l.detail, l.created_at AS createdAt,
              u.name AS actor, u.role AS actorRole
         FROM audit_log l LEFT JOIN users u ON u.id = l.actor_id
        ORDER BY l.id DESC LIMIT 200`,
    ),
  );
});

export default router;
