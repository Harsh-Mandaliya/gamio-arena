import { all, one, run, transaction } from '../db/index.js';
import { conflict, notFound } from '../http/errors.js';

/**
 * Moves money in or out of a wallet and writes the ledger row in the same
 * transaction. `amount` is signed: positive credits, negative debits.
 */
export function moveFunds({ userId, amount, kind, bookingId = null, note = null, actorId = null }) {
  return transaction(() => {
    const user = one('SELECT wallet_balance FROM users WHERE id = ?', userId);
    if (!user) throw notFound('Player');

    const balance = user.wallet_balance + amount;
    if (balance < 0) {
      throw conflict(`Not enough in the wallet: ₹${user.wallet_balance} available, ₹${-amount} needed`);
    }

    run('UPDATE users SET wallet_balance = ? WHERE id = ?', balance, userId);
    run(
      `INSERT INTO wallet_transactions (user_id, amount, kind, booking_id, balance_after, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId,
      amount,
      kind,
      bookingId,
      balance,
      note,
      actorId,
    );
    return balance;
  });
}

export function ledger(userId, limit = 50) {
  return all(
    `SELECT t.id, t.amount, t.kind, t.balance_after, t.note, t.created_at,
            b.code AS booking_code, s.name AS by_name
       FROM wallet_transactions t
       LEFT JOIN bookings b ON b.id = t.booking_id
       LEFT JOIN users s ON s.id = t.created_by AND s.id != t.user_id
      WHERE t.user_id = ?
      ORDER BY t.id DESC
      LIMIT ?`,
    userId,
    limit,
  ).map((t) => ({
    id: t.id,
    amount: t.amount,
    kind: t.kind,
    balanceAfter: t.balance_after,
    note: t.note,
    bookingCode: t.booking_code,
    by: t.by_name,
    createdAt: t.created_at,
  }));
}
