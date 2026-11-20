import { HttpError } from './errors.js';

/** Small fixed-window limiter, enough to slow down password guessing on a local box. */
export function rateLimit({ windowMs = 60_000, max = 10 } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return next(new HttpError(429, 'Too many attempts. Give it a minute and try again.'));
    }
    next();
  };
}
