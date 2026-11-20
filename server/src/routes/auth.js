import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { one, run } from '../db/index.js';
import { publicUser, requireUser, signToken } from '../http/auth.js';
import { badRequest, conflict, unauthorized } from '../http/errors.js';
import { rateLimit } from '../http/rate-limit.js';
import { record } from '../services/audit.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 12 });

const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,16}$/, 'Enter a valid phone number')
  .optional()
  .or(z.literal('').transform(() => undefined));

const registerBody = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(60),
  email: z.email('Enter a valid email').transform((e) => e.toLowerCase()),
  phone,
  password: z.string().min(8, 'Use at least 8 characters').max(72),
});

router.post('/register', limiter, async (req, res) => {
  const body = registerBody.parse(req.body);
  if (one('SELECT 1 FROM users WHERE email = ?', body.email)) {
    throw conflict('An account with this email already exists');
  }

  const hash = await bcrypt.hash(body.password, 10);
  const { lastInsertRowid } = run(
    "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'player')",
    body.name,
    body.email,
    body.phone ?? null,
    hash,
  );
  const user = one('SELECT * FROM users WHERE id = ?', lastInsertRowid);
  record(user.id, 'user.register', 'user', user.id);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

const loginBody = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

router.post('/login', limiter, async (req, res) => {
  const { email, password } = loginBody.parse(req.body);
  const user = one('SELECT * FROM users WHERE email = ?', email);

  // Same message either way so emails can't be probed.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw unauthorized('That email and password don’t match');
  }
  if (!user.is_active) throw unauthorized('This account has been paused. Contact the venue.');

  run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireUser, (req, res) => {
  const venue = req.user.venue_id ? one('SELECT id, name, slug FROM venues WHERE id = ?', req.user.venue_id) : null;
  res.json({ ...publicUser(req.user), venue });
});

const profileBody = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  phone,
});

router.patch('/me', requireUser, (req, res) => {
  const body = profileBody.parse(req.body);
  run(
    'UPDATE users SET name = COALESCE(?, name), phone = ? WHERE id = ?',
    body.name ?? null,
    body.phone ?? null,
    req.user.id,
  );
  res.json(publicUser(one('SELECT * FROM users WHERE id = ?', req.user.id)));
});

const passwordBody = z.object({
  current: z.string().min(1, 'Enter your current password'),
  next: z.string().min(8, 'Use at least 8 characters').max(72),
});

router.post('/me/password', requireUser, limiter, async (req, res) => {
  const { current, next } = passwordBody.parse(req.body);
  const row = one('SELECT password_hash FROM users WHERE id = ?', req.user.id);
  if (!(await bcrypt.compare(current, row.password_hash))) {
    throw badRequest('Current password is wrong', { current: 'Doesn’t match' });
  }
  run('UPDATE users SET password_hash = ? WHERE id = ?', await bcrypt.hash(next, 10), req.user.id);
  record(req.user.id, 'user.password', 'user', req.user.id);
  res.json({ ok: true });
});

export default router;
