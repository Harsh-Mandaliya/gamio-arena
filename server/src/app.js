import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { identify } from './http/auth.js';
import { errorHandler, notFoundHandler } from './http/errors.js';
import auth from './routes/auth.js';
import bookings from './routes/bookings.js';
import catalog from './routes/catalog.js';
import consoleRoutes from './routes/console/index.js';
import enquiries from './routes/enquiries.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(helmet({ crossOriginEmbedderPolicy: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(identify);

  const api = express.Router();
  api.get('/health', (req, res) => res.json({ ok: true }));
  api.use('/auth', auth);
  api.use(catalog);
  api.use(enquiries);
  api.use('/me', bookings);
  api.use('/console', consoleRoutes);
  api.use(notFoundHandler);

  app.use('/api', api);

  // After `npm run build`, the API also serves the client so one process runs everything.
  if (fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist, { maxAge: '1h', index: false }));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
