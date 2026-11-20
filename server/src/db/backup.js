// npm run backup
// Writes a consistent copy of the database to data/backups (or BACKUP_DIR),
// safe to run while the server is up. Keeps the newest 30 copies.

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { isoDate } from '../lib/time.js';
import { db } from './index.js';

const KEEP = 30;

fs.mkdirSync(config.backupDir, { recursive: true });
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${isoDate(now)}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const file = path.join(config.backupDir, `gamio-${stamp}.db`);

db.exec(`VACUUM INTO '${file.replaceAll("'", "''")}'`);
console.log(`Backup written: ${file}`);

const old = fs
  .readdirSync(config.backupDir)
  .filter((f) => /^gamio-.*\.db$/.test(f))
  .sort()
  .slice(0, -KEEP);
for (const f of old) fs.unlinkSync(path.join(config.backupDir, f));
if (old.length) console.log(`Removed ${old.length} older backup(s).`);
