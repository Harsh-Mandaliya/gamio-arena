// npm run reset-password -- someone@example.com NewPassword123
// For when the only admin is locked out. Also re-activates the account.

import bcrypt from 'bcryptjs';
import { one, run } from './index.js';

const [email, password] = process.argv.slice(2);

if (!email || !password || password.length < 8) {
  console.error('Usage: npm run reset-password -- <email> <new password, 8+ characters>');
  process.exit(1);
}

const user = one('SELECT id, name, role FROM users WHERE email = ?', email);
if (!user) {
  console.error(`No account with email ${email}`);
  process.exit(1);
}

run('UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?', await bcrypt.hash(password, 10), user.id);
run("INSERT INTO audit_log (action, entity, entity_id, detail) VALUES ('user.password', 'user', ?, 'reset from command line')", user.id);
console.log(`Password updated for ${user.name} (${user.role}).`);
