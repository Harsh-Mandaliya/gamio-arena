import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Node can read .env natively; no dotenv needed.
const envFile = path.join(serverRoot, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const env = process.env;

function resolveDbFile(value) {
  if (value === ':memory:') return value;
  return path.resolve(serverRoot, value || 'data/gamio.db');
}

function loadJwtSecret(dbFile) {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (dbFile === ':memory:') return crypto.randomBytes(32).toString('hex');

  // Keep the secret next to the database so tokens survive restarts.
  const secretFile = path.join(path.dirname(dbFile), 'jwt.secret');
  if (fs.existsSync(secretFile)) return fs.readFileSync(secretFile, 'utf8').trim();

  const secret = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(path.dirname(secretFile), { recursive: true });
  fs.writeFileSync(secretFile, secret);
  return secret;
}

const dbFile = resolveDbFile(env.DB_FILE);

export const config = {
  port: Number(env.PORT) || 4000,
  dbFile,
  jwtSecret: loadJwtSecret(dbFile),
  tokenTtl: '7d',
  cancelWindowHours: Number(env.CANCEL_WINDOW_HOURS ?? 2),
  bookingHorizonDays: Number(env.BOOKING_HORIZON_DAYS ?? 30),
  maxSlotsPerBooking: 4,
  demoMode: env.DEMO_MODE !== 'false',
  adminEmail: env.ADMIN_EMAIL || 'admin@gamio.local',
  adminPassword: env.ADMIN_PASSWORD || '',
  backupDir: path.resolve(serverRoot, env.BACKUP_DIR || 'data/backups'),
  isProduction: env.NODE_ENV === 'production',
  clientDist: path.resolve(serverRoot, '../client/dist'),
};
