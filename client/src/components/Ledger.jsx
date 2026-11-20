import { ReceiptText } from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import { money, stamp } from '../lib/format.js';

const KIND = { topup: 'Top-up', booking: 'Booking', refund: 'Refund', adjustment: 'Adjustment' };

export default function Ledger({ transactions }) {
  if (!transactions.length) {
    return (
      <EmptyState icon={<ReceiptText />} title="No transactions yet">
        Top-ups, bookings and refunds will show up here.
      </EmptyState>
    );
  }
  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>What</th>
            <th className="num">Amount</th>
            <th className="num">Balance</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td className="mono faint" style={{ whiteSpace: 'nowrap' }}>
                {stamp(t.createdAt)}
              </td>
              <td>
                <strong>{KIND[t.kind]}</strong>
                <div className="faint" style={{ fontSize: 13 }}>
                  {t.bookingCode ? <span className="mono">{t.bookingCode}</span> : t.note}
                  {t.by && ` · by ${t.by}`}
                </div>
              </td>
              <td className={`num ledger-amount ${t.amount > 0 ? 'is-credit' : ''}`}>
                {t.amount > 0 ? '+' : '−'}
                {money(Math.abs(t.amount))}
              </td>
              <td className="num mono">{money(t.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
