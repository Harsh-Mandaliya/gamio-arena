import { Router } from 'express';
import { requireRole } from '../../http/auth.js';
import admin from './admin.js';
import desk from './desk.js';
import overview from './overview.js';
import venues from './venues.js';

// Everything under /api/console needs at least a staff account.
// Finer checks (manager, admin, venue scope) happen inside each router.
const router = Router();
router.use(requireRole('staff'));
router.use(overview);
router.use(desk);
router.use(venues);
router.use(admin);

export default router;
