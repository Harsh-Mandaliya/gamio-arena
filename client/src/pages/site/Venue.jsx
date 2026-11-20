import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Banknote, CalendarX2, Clock3, MapPin, Minus, Phone, Plus, Users, WalletCards } from 'lucide-react';
import { post } from '../../api/client.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { Glyph } from '../../components/ActivityIcon.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageLoader, { ErrorNote } from '../../components/PageLoader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import VenueArt from '../../components/VenueArt.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { addDays, clock, dayLabel, duration, isoDate, money, parseDate } from '../../lib/format.js';

const DAYS_SHOWN = 14;

function DateStrip({ value, onChange }) {
  const today = isoDate();
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i));
  return (
    <div className="date-strip" role="group" aria-label="Date">
      {days.map((iso) => {
        const d = parseDate(iso);
        const weekend = d.getDay() === 0 || d.getDay() === 6;
        return (
          <button
            key={iso}
            className={`date-chip ${weekend ? 'is-weekend' : ''}`}
            aria-pressed={iso === value}
            onClick={() => onChange(iso)}
          >
            <span className="date-chip__dow">{iso === today ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
            <span className="date-chip__day">{d.getDate()}</span>
            <span className="date-chip__mon">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlotGrid({ slots, start, count, onPick }) {
  const startIdx = slots.findIndex((s) => s.start === start);
  return (
    <>
      <div className="slot-grid">
        {slots.map((s, i) => {
          const picked = i === startIdx;
          const inRange = startIdx >= 0 && i > startIdx && i < startIdx + count;
          return (
            <button
              key={s.start}
              className={`slot ${s.peak ? 'is-peak' : ''} ${picked ? 'is-picked' : ''} ${inRange ? 'is-picked is-in-range' : ''}`}
              disabled={s.state !== 'open'}
              onClick={() => onPick(s.start)}
              aria-pressed={picked || inRange}
              title={s.state === 'open' ? `${s.start}–${s.end}` : s.state === 'booked' ? 'Taken' : s.state === 'blocked' ? 'Unavailable' : 'Gone'}
            >
              <span className="slot__time">{s.start}</span>
              <span className="slot__price">{s.state === 'open' ? money(s.price) : s.state === 'booked' ? 'Taken' : s.state === 'blocked' ? 'Closed' : '—'}</span>
            </button>
          );
        })}
      </div>
      <div className="slot-legend">
        <span>
          <i style={{ background: 'var(--card)' }} /> Free
        </span>
        <span>
          <i style={{ background: 'var(--orange)' }} /> Your pick
        </span>
        <span>
          <i style={{ background: 'repeating-linear-gradient(-45deg, transparent 0 3px, var(--line-soft) 3px 4px)', borderStyle: 'dashed' }} />{' '}
          Taken or closed
        </span>
        <span className="mono" style={{ color: 'var(--orange)', fontSize: 11 }}>
          PEAK = after 6pm &amp; weekends
        </span>
      </div>
    </>
  );
}

function Stepper({ value, min, max, onChange, label }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${label}`}>
        <Minus size={16} />
      </button>
      <output>{value}</output>
      <button onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More ${label}`}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function Venue() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const venue = useApi(`/venues/${slug}`);
  const v = venue.data;
  usePageTitle(v?.name);

  const [resourceId, setResourceId] = useState(() => Number(params.get('resource')) || null);
  const [date, setDate] = useState(() => params.get('date') || isoDate());
  const [start, setStart] = useState(() => params.get('start'));
  const [count, setCount] = useState(1);
  const [players, setPlayers] = useState(2);
  const [payment, setPayment] = useState('venue');
  const [busy, setBusy] = useState(false);

  // Default to the first table once the venue loads.
  useEffect(() => {
    if (v && !v.resources.some((r) => r.id === resourceId)) setResourceId(v.resources[0]?.id ?? null);
  }, [v, resourceId]);

  const resource = v?.resources.find((r) => r.id === resourceId);
  const slots = useApi(resourceId ? `/resources/${resourceId}/slots` : null, { date });

  useEffect(() => {
    if (resource) setPlayers((p) => Math.min(Math.max(p, 1), resource.capacity));
  }, [resource]);

  // Drop a picked time that isn't free on the newly chosen day/table.
  useEffect(() => {
    if (!slots.data || !start) return;
    const s = slots.data.slots.find((x) => x.start === start);
    if (!s || s.state !== 'open') setStart(null);
  }, [slots.data, start]);

  const chosen = useMemo(() => {
    if (!slots.data || !start) return [];
    const i = slots.data.slots.findIndex((s) => s.start === start);
    return i < 0 ? [] : slots.data.slots.slice(i, i + count);
  }, [slots.data, start, count]);

  // How many back-to-back free slots follow the picked start.
  const maxCount = useMemo(() => {
    if (!slots.data || !start) return 1;
    const list = slots.data.slots;
    let i = list.findIndex((s) => s.start === start);
    let n = 0;
    while (i >= 0 && i < list.length && list[i].state === 'open' && n < 4) n++, i++;
    return Math.max(1, n);
  }, [slots.data, start]);

  useEffect(() => {
    setCount((c) => Math.min(c, maxCount));
  }, [maxCount]);

  const total = chosen.reduce((sum, s) => sum + s.price, 0);
  const walletShort = user && user.wallet < total;

  useEffect(() => {
    if (payment === 'wallet' && walletShort) setPayment('venue');
  }, [payment, walletShort]);

  const pickResource = (id) => {
    setResourceId(id);
    setStart(null);
    setCount(1);
  };

  const confirm = async () => {
    if (!user) {
      navigate('/sign-in', { state: { from: `/venues/${slug}?resource=${resourceId}&date=${date}&start=${start ?? ''}` } });
      return;
    }
    setBusy(true);
    try {
      const booking = await post('/me/bookings', { resourceId, date, start, slotCount: count, players, paymentMethod: payment });
      await refresh();
      navigate(`/me/bookings/${booking.code}?new=1`);
    } catch (err) {
      toast.error(err);
      slots.reload();
    } finally {
      setBusy(false);
    }
  };

  if (venue.loading) return <PageLoader />;
  if (venue.error)
    return (
      <div className="wrap" style={{ paddingTop: 40 }}>
        <ErrorNote error={venue.error} onRetry={venue.reload} />
      </div>
    );

  const groups = v.resources.reduce((acc, r) => {
    (acc[r.activity.slug] ??= { activity: r.activity, items: [] }).items.push(r);
    return acc;
  }, {});

  const ready = resource && chosen.length === count && chosen.length > 0;

  return (
    <div className="wrap">
      <section className="venue-hero">
        <VenueArt venue={v} />
        <div className="venue-hero__card card">
          <div className="spread">
            <span className="eyebrow">{v.city}</span>
            <span className={`pill ${v.openNow ? 'pill--ok' : ''}`}>{v.openNow ? 'Open now' : 'Closed right now'}</span>
          </div>
          <h1 style={{ marginTop: 8 }}>{v.name}</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: '70ch' }}>
            {v.description}
          </p>
          <div className="venue-facts">
            <span>
              <MapPin /> {v.address}
            </span>
            <span>
              <Clock3 /> {clock(v.opensAt)} – {clock(v.closesAt)}
            </span>
            {v.phone && (
              <span>
                <Phone /> {v.phone}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="book-layout">
        <div>
          <section className="book-step">
            <h2 className="book-step__title">
              <span className="book-step__num">1</span> Pick a table or court
            </h2>
            {Object.values(groups).map(({ activity, items }) => (
              <div key={activity.slug} className="resource-group">
                <div className="resource-group__label">
                  <Glyph activity={activity} size="sm" /> {activity.name}
                </div>
                <div className="resource-list">
                  {items.map((r) => (
                    <button key={r.id} className="resource-option" aria-pressed={r.id === resourceId} onClick={() => pickResource(r.id)}>
                      <strong>{r.name}</strong>
                      <span className="mono faint">
                        {money(r.price)}
                        {r.peakPrice ? ` · ${money(r.peakPrice)} peak` : ''} / {r.slotMinutes}m
                      </span>
                      <span className="faint" style={{ fontSize: 13 }}>
                        Up to {r.capacity} players
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="book-step">
            <h2 className="book-step__title">
              <span className="book-step__num">2</span> Choose a day
            </h2>
            <DateStrip
              value={date}
              onChange={(d) => {
                setDate(d);
                setStart(null);
              }}
            />
          </section>

          <section className="book-step">
            <h2 className="book-step__title">
              <span className="book-step__num">3</span> Grab a time
            </h2>
            <ErrorNote error={slots.error} onRetry={slots.reload} />
            {slots.loading && !slots.data ? (
              <div className="slot-grid">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="skeleton" style={{ height: 58 }} />
                ))}
              </div>
            ) : slots.data?.slots.some((s) => s.state === 'open') ? (
              <SlotGrid slots={slots.data.slots} start={start} count={count} onPick={setStart} />
            ) : (
              <div className="card card--flat">
                <EmptyState icon={<CalendarX2 />} title="Fully booked">
                  Nothing free on {dayLabel(date).toLowerCase()} for {resource?.name}. Try another day or another table.
                </EmptyState>
              </div>
            )}
          </section>
        </div>

        <aside className="summary card" id="summary">
          <div className="summary__head">
            <span className="eyebrow" style={{ color: '#9aa49d' }}>
              Your booking
            </span>
            <h3 style={{ marginTop: 6 }}>{resource ? `${resource.name}` : 'Pick a table'}</h3>
            {resource && <span style={{ fontSize: 14, opacity: 0.75 }}>{resource.activity.name}</span>}
          </div>
          <div className="summary__body">
            <div className="summary__line">
              <span>Day</span>
              <strong>{dayLabel(date)}</strong>
            </div>
            <div className="summary__line">
              <span>Time</span>
              <strong className="mono">{ready ? `${chosen[0].start} – ${chosen.at(-1).end}` : 'Pick a slot'}</strong>
            </div>
            <div className="summary__line" style={{ alignItems: 'center' }}>
              <span>Length</span>
              <span className="row" style={{ '--gap': '10px' }}>
                <span className="faint" style={{ fontSize: 13 }}>
                  {ready ? duration(chosen[0].start, chosen.at(-1).end) : ''}
                </span>
                <Stepper value={count} min={1} max={maxCount} onChange={setCount} label="slots" />
              </span>
            </div>
            <div className="summary__line" style={{ alignItems: 'center' }}>
              <span>
                <Users size={15} style={{ display: 'inline', verticalAlign: '-2px' }} /> Players
              </span>
              <Stepper value={players} min={1} max={resource?.capacity ?? 1} onChange={setPlayers} label="players" />
            </div>

            <div className="pay-options" role="group" aria-label="Payment">
              <button className="pay-option" aria-pressed={payment === 'venue'} onClick={() => setPayment('venue')}>
                <Banknote />
                <span>
                  <strong>Pay at the counter</strong>
                  <small>Cash or UPI when you arrive</small>
                </span>
              </button>
              <button
                className="pay-option"
                aria-pressed={payment === 'wallet'}
                onClick={() => setPayment('wallet')}
                disabled={!user || walletShort}
              >
                <WalletCards />
                <span>
                  <strong>Gamio wallet</strong>
                  <small>
                    {!user ? 'Sign in to use your wallet' : walletShort ? `Balance ${money(user.wallet)}, top up at any desk` : `Balance ${money(user.wallet)}`}
                  </small>
                </span>
              </button>
            </div>

            <div className="summary__total">
              <span className="muted">Total</span>
              <strong>{money(total)}</strong>
            </div>
            <button className="btn btn--accent btn--lg btn--block" disabled={!ready || busy} onClick={confirm}>
              {busy ? 'Booking…' : user ? 'Confirm booking' : 'Sign in to book'}
            </button>
            <p className="faint" style={{ fontSize: 12.5, textAlign: 'center' }}>
              Free cancellation up to 2 hours before. Wallet payments are refunded to your wallet.
            </p>
          </div>
        </aside>
      </div>

      {ready && (
        <div className="mobile-bar no-print">
          <div>
            <div className="faint" style={{ fontSize: 12.5 }}>
              {chosen[0].start}–{chosen.at(-1).end} · {resource.name}
            </div>
            <strong>{money(total)}</strong>
          </div>
          <a href="#summary" className="btn btn--accent">
            Review &amp; book
          </a>
        </div>
      )}

      {!user && (
        <p className="faint" style={{ marginTop: 20, fontSize: 14 }}>
          New here? <Link to="/sign-up">Create an account</Link> in under a minute.
        </p>
      )}
    </div>
  );
}
