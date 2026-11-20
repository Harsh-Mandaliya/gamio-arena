import crypto from 'node:crypto';
import { config } from './config.js';
import { one } from './db/index.js';
import { seed, seedEssentials } from './db/seed.js';
import { createApp } from './app.js';

if (!one('SELECT 1 FROM users LIMIT 1')) {
  if (config.demoMode) {
    console.log('Empty database, loading demo venues and accounts...');
    await seed();
  } else {
    const email = config.adminEmail;
    const password = config.adminPassword || crypto.randomBytes(9).toString('base64url');
    await seedEssentials({ email, password });
    console.log('\nFirst start. Admin account created:');
    console.log(`  email:    ${email}`);
    if (!config.adminPassword) console.log(`  password: ${password}   (shown once, change it after signing in)`);
    console.log('');
  }
}

createApp().listen(config.port, () => {
  console.log(`Gamio Arena running on http://localhost:${config.port}`);
});
