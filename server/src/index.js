import { config } from './config.js';
import { one } from './db/index.js';
import { seed } from './db/seed.js';
import { createApp } from './app.js';

if (!one('SELECT 1 FROM users LIMIT 1')) {
  console.log('Empty database, loading demo venues and accounts...');
  await seed();
}

createApp().listen(config.port, () => {
  console.log(`Gamio Arena API on http://localhost:${config.port}`);
});
