import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarPlus, History } from 'lucide-react';
import EmptyState from '../../components/EmptyState.jsx';
import PageLoader, { ErrorNote } from '../../components/PageLoader.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { dayLabel, money, parseDate } from '../../lib/format.js';

function BookingRow({ b }) {
  const d = parseDate(b.date);
  return (
    <Link to={`/me/bookings/${b.code}`} className="booking-row card" style={{ '--tone': b.activity.color }}>
      <div className="booking-row__date">
        <span>{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
        <b>{d.getDate()}</b>
        <span>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
      </div>
      <div className="booking-row__info">
        <span className="eyebrow">{b.activity.name}</span>
        <h3>
          {b.resource.name} · {b.venue.name}
        </h3>
        <span className="mono muted" style={{ fontSize: 13.5 }}>
          {dayLabel(b.date)} · {b.start}–{b.end} · {b.code}
        </span>
      </div>
      <div className="booking-row__side">
        <StatusPill value={b.status} />
        <strong className="mono">{money(b.amount)}</strong>
      </div>
    </Link>
  );
}

export default function MyBookings() {
  usePageTitle('My bookings');
  const { data, error, loading, reload } = useApi('/me/bookings');
  const [tab, setTab] = useState('upcoming');

  if (loading && !data) return <PageLoader />;
  const list = data?.[tab] ?? [];

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <ErrorNote error={error} onRetry={reload} />
      <div className="spread">
        <div className="seg" role="group" aria-label="Which bookings">
          <button aria-pressed={tab === 'upcoming'} onClick={() => setTab('upcoming')}>
            Coming up ({data?.upcoming.length ?? 0})
          </button>
          <button aria-pressed={tab === 'past'} onClick={() => setTab('past')}>
            History ({data?.past.length ?? 0})
          </button>
        </div>
        <Link to="/play" className="btn btn--accent btn--sm">
          <CalendarPlus /> New booking
        </Link>
      </div>

      {list.length ? (
        <div className="booking-list">
          {list.map((b) => (
            <BookingRow key={b.id} b={b} />
          ))}
        </div>
      ) : (
        <div className="card card--flat">
          {tab === 'upcoming' ? (
            <EmptyState
              icon={<CalendarPlus />}
              title="Nothing booked yet"
              action={
                <Link to="/play" className="btn btn--primary">
                  Find a slot
                </Link>
              }
            >
              Your next game shows up here with a code to show at the desk.
            </EmptyState>
          ) : (
            <EmptyState icon={<History />} title="No history yet">
              Games you&apos;ve played or cancelled will be listed here.
            </EmptyState>
          )}
        </div>
      )}
    </div>
  );
}
