import { all, inList } from '../db/index.js';
import { forbidden } from '../http/errors.js';

/**
 * Which venues a console user can see.
 * Admins see everything (null), managers see the venues they run,
 * staff see the venue they're assigned to.
 */
export function venueIdsFor(user) {
  if (user.role === 'admin') return null;
  if (user.role === 'manager') return all('SELECT id FROM venues WHERE manager_id = ?', user.id).map((r) => r.id);
  if (user.role === 'staff') return user.venue_id ? [user.venue_id] : [];
  return [];
}

export function canAccessVenue(user, venueId) {
  const ids = venueIdsFor(user);
  return ids === null || ids.includes(Number(venueId));
}

export function assertVenueAccess(user, venueId) {
  if (!canAccessVenue(user, venueId)) throw forbidden("That venue isn't on your roster");
}

/** SQL fragment restricting `column` to the user's venues. */
export function venueFilter(user, column = 'v.id') {
  const ids = venueIdsFor(user);
  if (ids === null) return { sql: '1', params: [] };
  return inList(column, ids);
}
