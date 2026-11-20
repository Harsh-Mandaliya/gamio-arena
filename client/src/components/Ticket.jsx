import Barcode from './Barcode.jsx';
import { Glyph } from './ActivityIcon.jsx';
import StatusPill from './StatusPill.jsx';
import { duration, longDate, money } from '../lib/format.js';

export default function Ticket({ booking: b }) {
  return (
    <article className="ticket" style={{ '--tone': b.activity.color }}>
      <div className="ticket__main">
        <div className="ticket__band">
          <Glyph activity={b.activity} />
          <div>
            <span className="eyebrow" style={{ color: 'rgb(255 255 255 / 0.75)' }}>
              {b.activity.name}
            </span>
            <h2>{b.resource.name}</h2>
          </div>
        </div>
        <dl className="ticket__grid">
          <div>
            <dt>Venue</dt>
            <dd>{b.venue.name}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{longDate(b.date)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd className="mono">
              {b.start} – {b.end} <span className="faint" style={{ fontSize: 13 }}>({duration(b.start, b.end)})</span>
            </dd>
          </div>
          <div>
            <dt>Players</dt>
            <dd>{b.players}</dd>
          </div>
          <div>
            <dt>Booked for</dt>
            <dd>{b.customer.name}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>
              {money(b.amount)} <span className="faint" style={{ fontSize: 13 }}>· {b.paymentMethod === 'wallet' ? 'wallet' : 'at venue'}</span>
            </dd>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <dt>Address</dt>
            <dd style={{ fontWeight: 500 }}>
              {b.venue.address}, {b.venue.city}
            </dd>
          </div>
        </dl>
      </div>
      <div className="ticket__stub">
        <div className="row" style={{ justifyContent: 'center', '--gap': '6px' }}>
          <StatusPill value={b.status} />
          <StatusPill kind="payment" value={b.paymentStatus} />
        </div>
        <Barcode value={b.code} />
        <div>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>
            Show at desk
          </div>
          <div className="ticket__code">{b.code}</div>
        </div>
      </div>
    </article>
  );
}
