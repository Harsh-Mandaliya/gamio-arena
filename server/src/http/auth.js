import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { one } from '../db/index.js';
import { forbidden, unauthorized } from './errors.js';

export const ROLE_RANK = { player: 0, staff: 1, manager: 2, admin: 3 };

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.tokenTtl });
}

/**
 * Attaches req.user when a valid token is present. Never rejects on its own;
 * pair with requireRole for protected routes. The user row is re-read so
 * role changes and deactivations take effect immediately.
 */
export function identify(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const { sub } = jwt.verify(token, config.jwtSecret);
    const user = one(
      'SELECT id, name, email, phone, role, venue_id, wallet_balance, is_active FROM users WHERE id = ?',
      sub,
    );
    if (user?.is_active) req.user = user;
  } catch {
    // Expired or tampered token: treat as signed out.
  }
  next();
}

/** requireRole('staff') lets staff, managers and admins through. */
export function requireRole(minimum = 'player') {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (ROLE_RANK[req.user.role] < ROLE_RANK[minimum]) return next(forbidden());
    next();
  };
}

export const requireUser = requireRole('player');

export function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    venueId: u.venue_id,
    wallet: u.wallet_balance,
  };
}
