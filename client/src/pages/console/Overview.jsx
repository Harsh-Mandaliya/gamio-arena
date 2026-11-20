import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarClock, Gauge, Inbox, IndianRupee, MonitorPlay, Users } from 'lucide-react';
import { get } from '../../api/client.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { Glyph } from '../../components/ActivityIcon.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageLoader, { ErrorNote } from '../../components/PageLoader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import BookingPanel from '../../components/console/BookingPanel.jsx';
import { DailyBars, ShareBars } from '../../components/console/Charts.jsx';
import VenueSelect from '../../components/console/VenueSelect.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { dayLabel, money, moneyShort } from '../../lib/format.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late shift';
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

export default function Overview() {
  usePageTitle('Console');
  const { user } = useAuth();
  const toast = useToast();
  const [venueId, setVenueId] = useState(null);
  const [metric, setMetric] = useState('bookings');
  const [open, setOpen] = useState(null);
  const { data, error, loading, reload } = useApi('/console/overview', { venueId });

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const { today, revenue } = data;
  const delta = revenue.lastMonthToDate ? Math.round(((revenue.month - revenue.lastMonthToDate) / revenue.lastMonthToDate) * 100) : null;

  return (
    <>
      <div className="c-head">
        <div>
          <span className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1 style={{ marginTop: 6 }}>
            {greeting()}, {user.name.split(' ')[0]}
          </h1>
        </div>
        <div className="c-toolbar">
          <VenueSelect value={venueId} onChange={setVenueId} allowAll />
          <Link to="/console/desk" className="btn btn--dark btn--sm">
            <MonitorPlay /> Open front desk
          </Link>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi card" style={{ '--kpi-tone': 'var(--chalk)' }}>
          <div className="kpi__label">
            <CalendarClock /> Games today
          </div>
          <div className="kpi__value">{today.bookings}</div>
          <div className="kpi__sub">
            {today.checkedIn} on the floor · {today.completed} done
          </div>
        </div>
        <div className="kpi card" style={{ '--kpi-tone': 'var(--orange)' }}>
          <div className="kpi__label">
            <Gauge /> Floor busy
          </div>
          <div className="kpi__value">{today.utilisation}%</div>
          <div className="kpi__meter">
            <span style={{ width: `${today.utilisation}%` }} />
          </div>
        </div>
        <div className="kpi card" style={{ '--kpi-tone': 'var(--warn)' }}>
          <div className="kpi__label">
            <IndianRupee /> Still to collect today
          </div>
          <div className="kpi__value">{money(today.due)}</div>
          <div className="kpi__sub">Counter payments not marked paid</div>
        </div>
        <div className="kpi card">
          <div className="kpi__label">
            <IndianRupee /> Collected this month
          </div>
          <div className="kpi__value">{moneyShort(revenue.month)}</div>
          <div className="kpi__sub">
            {delta === null ? 'No data for last month' : (
              <>
                <span className={delta >= 0 ? 'trend-up' : 'trend-down'}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
                </span>{' '}
                vs same point last month
              </>
            )}
          </div>
        </div>
        {data.people && (
          <div className="kpi card" style={{ '--kpi-tone': 'var(--berry)' }}>
            <div className="kpi__label">
              <Users /> Active players
            </div>
            <div className="kpi__value">{data.people.player ?? 0}</div>
            <div className="kpi__sub">
              <Link to="/console/inbox" className="row" style={{ '--gap': '6px', display: 'inline-flex' }}>
                <Inbox size={14} /> {data.newEnquiries} new enquiries
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="c-grid">
        <section className="card">
          <div className="card__head">
            <h2>Last 14 days</h2>
            <div className="seg">
              <button aria-pressed={metric === 'bookings'} onClick={() => setMetric('bookings')}>
                Games
              </button>
              <button aria-pressed={metric === 'revenue'} onClick={() => setMetric('revenue')}>
                Collected
              </button>
            </div>
          </div>
          <DailyBars days={data.daily} metric={metric} />
        </section>

        <section className="card">
          <div className="card__head">
            <h2>What people play</h2>
            <span className="faint mono" style={{ fontSize: 12 }}>
              30 days
            </span>
          </div>
          {data.byActivity.length ? (
            <ShareBars
              rows={data.byActivity}
              label={(r) => (
                <span className="row" style={{ '--gap': '8px' }}>
                  <Glyph activity={r} size="sm" /> {r.name}
                </span>
              )}
              format={(n) => `${n} games`}
            />
          ) : (
            <EmptyState title="No games yet" />
          )}
        </section>
      </div>

      <div className="c-grid">
        <section className="card">
          <div className="card__head">
            <h2>Up next</h2>
            <Link to="/console/bookings" className="btn btn--sm btn--ghost">
              All bookings
            </Link>
          </div>
          {data.upNext.length ? (
            <div className="next-list">
              {data.upNext.map((b) => (
                <button key={b.id} className="next-item" onClick={() => get(`/console/bookings/${b.code}`).then(setOpen, toast.error)}>
                  <Glyph activity={b.activity} size="sm" />
                  <span style={{ minWidth: 0 }}>
                    <strong>{b.customer.name}</strong>
                    <span className="faint" style={{ display: 'block', fontSize: 13 }}>
                      {b.resource.name} · {b.venue.name}
                    </span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="next-item__time">{b.start}</span>
                    <span className="faint" style={{ display: 'block', fontSize: 12 }}>
                      {dayLabel(b.date)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing coming up">The rest of today is open.</EmptyState>
          )}
        </section>

        <section className="card">
          <div className="card__head">
            <h2>Busiest tables</h2>
            <span className="faint mono" style={{ fontSize: 12 }}>
              30 days
            </span>
          </div>
          <ShareBars
            rows={data.topResources}
            label={(r) => (
              <span>
                {r.name} <span className="faint" style={{ fontWeight: 400 }}>· {r.venue}</span>
              </span>
            )}
            format={(n) => `${n}`}
          />
        </section>
      </div>

      {open && <BookingPanel booking={open} onClose={() => setOpen(null)} onChange={() => reload()} />}
    </>
  );
}
