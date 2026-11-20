import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ScanLine } from 'lucide-react';
import { get } from '../../api/client.js';
import { Glyph } from '../../components/ActivityIcon.jsx';
import PageLoader, { ErrorNote } from '../../components/PageLoader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import BookingPanel from '../../components/console/BookingPanel.jsx';
import VenueSelect from '../../components/console/VenueSelect.jsx';
import WalkInModal from '../../components/console/WalkInModal.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { addDays, dayLabel, isoDate, toMinutes } from '../../lib/format.js';

const HOUR_W = 132; // px per hour on the board

export default function FrontDesk() {
  usePageTitle('Front desk');
  const toast = useToast();
  const [venueId, setVenueId] = useState(null);
  const [date, setDate] = useState(isoDate());
  const [open, setOpen] = useState(null);
  const [walkIn, setWalkIn] = useState(null);
  const [code, setCode] = useState('');
  const [now, setNow] = useState(new Date());
  const scroller = useRef(null);

  const { data, error, loading, reload } = useApi(venueId ? '/console/schedule' : null, { venueId, date });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Keep the board fresh while it sits open on the desk screen.
  useEffect(() => {
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
  }, [reload]);

  const opens = data ? toMinutes(data.venue.opensAt) : 0;
  const closes = data ? toMinutes(data.venue.closesAt) : 0;
  const px = useCallback((min) => ((min - opens) / 60) * HOUR_W, [opens]);
  const hours = useMemo(() => {
    const list = [];
    for (let m = Math.ceil(opens / 60) * 60; m <= closes; m += 60) list.push(m);
    return list;
  }, [opens, closes]);

  const isToday = date === isoDate();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= opens && nowMin <= closes;

  // Scroll so "now" (or opening time) is in view.
  useEffect(() => {
    if (!data || !scroller.current) return;
    scroller.current.scrollLeft = showNow ? Math.max(0, px(nowMin) - 200) : 0;
    // only when the board itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.venue.id, date]);

  const checkIn = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    try {
      const b = await get(`/console/bookings/${c.startsWith('GA-') ? c : `GA-${c}`}`);
      setOpen(b);
      setCode('');
    } catch (err) {
      toast.error(err.status === 404 ? `No booking ${c} at your venues` : err);
    }
  };

  const clickTrack = (resource, e) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = opens + ((e.clientX - rect.left) / HOUR_W) * 60;
    const slotStart = opens + Math.floor((minute - opens) / resource.slotMinutes) * resource.slotMinutes;
    const hh = String(Math.floor(slotStart / 60)).padStart(2, '0');
    const mm = String(slotStart % 60).padStart(2, '0');
    setWalkIn({ resource, start: `${hh}:${mm}` });
  };

  return (
    <>
      <div className="c-head">
        <div>
          <span className="eyebrow">Live board</span>
          <h1 style={{ marginTop: 6 }}>Front desk</h1>
          <p>Click an empty stretch of a row to take a walk-in. Click a booking to check in, collect or cancel.</p>
        </div>
      </div>

      <div className="desk-bar">
        <VenueSelect value={venueId} onChange={setVenueId} />
        <div className="date-nav">
          <button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            <ChevronLeft size={18} />
          </button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
          <button onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
            <ChevronRight size={18} />
          </button>
        </div>
        {!isToday && (
          <button className="btn btn--sm btn--ghost" onClick={() => setDate(isoDate())}>
            Today
          </button>
        )}
        <span className="pill pill--plain">{dayLabel(date)}</span>
        <form className="checkin" onSubmit={checkIn}>
          <input className="input input--sm" placeholder="GA-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Booking code" />
          <button className="btn btn--sm btn--primary">
            <ScanLine /> Find
          </button>
        </form>
      </div>

      <ErrorNote error={error} onRetry={reload} />

      {!data && loading ? (
        <PageLoader />
      ) : data ? (
        <>
          <div className="timeline" ref={scroller} style={{ '--track-w': `${px(closes)}px`, '--hour-w': `${HOUR_W}px` }}>
            <div className="timeline__inner">
              <div className="timeline__head">
                <div className="timeline__corner">{data.resources.length} tables</div>
                <div className="timeline__hours">
                  {hours.map((m) => (
                    <span key={m} style={{ left: px(m) }}>
                      {String(m / 60).padStart(2, '0')}:00
                    </span>
                  ))}
                </div>
              </div>

              {data.resources.map((r) => (
                <div key={r.id} className="timeline__row">
                  <div className="timeline__label">
                    <Glyph activity={r.activity} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <strong>{r.name}</strong>
                      <span>
                        {r.activity.name} · {r.capacity}p
                      </span>
                    </div>
                  </div>
                  <div className="timeline__track" onClick={(e) => clickTrack(r, e)} title="Click to book">
                    {data.blocks
                      .filter((bl) => bl.resourceId === r.id)
                      .map((bl) => (
                        <div
                          key={`bl${bl.id}`}
                          className="tl-block"
                          style={{ left: px(toMinutes(bl.start)), width: px(toMinutes(bl.end)) - px(toMinutes(bl.start)) }}
                          title={`${bl.start}–${bl.end} ${bl.reason}`}
                        >
                          {bl.reason}
                        </div>
                      ))}
                    {data.bookings
                      .filter((b) => b.resource.id === r.id)
                      .map((b) => (
                        <button
                          key={b.id}
                          className={`tl-item is-${b.status} ${b.paymentStatus === 'unpaid' ? 'is-unpaid' : ''}`}
                          style={{ left: px(toMinutes(b.start)) + 2, width: px(toMinutes(b.end)) - px(toMinutes(b.start)) - 4 }}
                          onClick={() => setOpen(b)}
                          title={`${b.code} · ${b.customer.name}`}
                        >
                          <strong>{b.customer.name}</strong>
                          <span>
                            {b.start}–{b.end}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            {showNow && <div className="tl-now" style={{ left: `calc(var(--label-w) + ${px(nowMin)}px)` }} />}
          </div>

          <div className="legend">
            <span>
              <i style={{ background: 'var(--chalk-soft)' }} /> Booked
            </span>
            <span>
              <i style={{ background: 'var(--felt)' }} /> Checked in
            </span>
            <span>
              <i style={{ background: 'var(--ok-soft)' }} /> Played
            </span>
            <span>
              <i style={{ background: 'var(--bad-soft)' }} /> No-show
            </span>
            <span>
              <i style={{ background: 'repeating-linear-gradient(-45deg, transparent 0 3px, var(--line-soft) 3px 5px)', borderStyle: 'dashed' }} /> Blocked
            </span>
            <span>
              <i style={{ background: 'var(--warn)', borderRadius: '50%' }} /> Payment due
            </span>
          </div>
        </>
      ) : null}

      {open && <BookingPanel booking={open} onClose={() => setOpen(null)} onChange={reload} />}
      {walkIn && (
        <WalkInModal
          resource={walkIn.resource}
          date={date}
          start={walkIn.start}
          onClose={() => setWalkIn(null)}
          onBooked={() => {
            setWalkIn(null);
            reload();
          }}
        />
      )}
    </>
  );
}
