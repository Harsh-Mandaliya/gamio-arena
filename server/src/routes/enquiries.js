import { Router } from 'express';
import { z } from 'zod';
import { run } from '../db/index.js';
import { rateLimit } from '../http/rate-limit.js';

const router = Router();

const body = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(60),
  email: z.email('Enter a valid email'),
  topic: z.enum(['general', 'booking', 'events', 'partnership']).default('general'),
  message: z.string().trim().min(10, 'A little more detail, please').max(2000),
});

router.post('/enquiries', rateLimit({ windowMs: 10 * 60_000, max: 5 }), (req, res) => {
  const e = body.parse(req.body);
  run('INSERT INTO enquiries (name, email, topic, message) VALUES (?, ?, ?, ?)', e.name, e.email, e.topic, e.message);
  res.status(201).json({ ok: true });
});

export default router;
