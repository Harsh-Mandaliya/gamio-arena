import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { ActivityIcon, Glyph } from '../../components/ActivityIcon.jsx';
import VenueCard from '../../components/VenueCard.jsx';
import GameShowcase from '../../components/showcase/GameShowcase.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { dayLabel, money } from '../../lib/format.js';

function NextFreeBoard() {
  const { data, loading } = useApi('/highlights');
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <aside className="board card" aria-label="Next free slots">
      <div className="board__head">
        <span>
          Next free <strong>·</strong> live
        </span>
        <span>Updated {now}</span>
      </div>
      {loading && !data
        ? Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="board__row">
              <span className="skeleton" style={{ width: 30, height: 30, opacity: 0.15 }} />
              <span className="skeleton" style={{ height: 16, opacity: 0.15 }} />
              <span />
              <span />
            </div>
          ))
        : data?.nextOpen.map((slot, i) => (
            <Link
              key={slot.resourceId}
              to={`/venues/${slot.venue.slug}?resource=${slot.resourceId}&date=${slot.date}&start=${slot.start}`}
              className="board__row"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Glyph activity={slot.activity} size="sm" />
              <span className="board__what">
                <strong>{slot.activity.name}</strong>
                <span>
                  {slot.resource} · {slot.venue.name}
                </span>
              </span>
              <span className="board__price">{money(slot.price)}</span>
              <span className="board__time">
                <small>{dayLabel(slot.date)}</small>
                {slot.start}
              </span>
            </Link>
          ))}
      <div className="board__foot">Tap a row to jump straight to that slot.</div>
    </aside>
  );
}

function Ticker({ activities }) {
  if (!activities?.length) return null;
  const items = [...activities, ...activities];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">
        {items.map((a, i) => (
          <span key={i} className="ticker__item">
            <ActivityIcon name={a.icon} /> {a.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  usePageTitle(null);
  const { data: highlights } = useApi('/highlights');
  const { data: activities } = useApi('/activities');
  const { data: venues } = useApi('/venues');
  const stats = highlights?.stats;

  return (
    <>
      <GameShowcase />
      <section className="hero">
        <div className="wrap hero__grid">
          <div>
            <span className="eyebrow">
              <span className="live-dot" /> Ahmedabad · Vadodara · Surat
            </span>
            <h1 className="hero__title">
              Book the table.
              <br />
              Bring the <span className="scribble">crew.</span>
            </h1>
            <p className="hero__lede">
              Pool, table tennis, badminton, bowling, box cricket and more across every Gamio hall. Pick a slot, pay
              from your wallet or at the counter, and walk straight in.
            </p>
            <div className="row hero__cta">
              <Link to="/play" className="btn btn--lg btn--accent">
                Find a free slot <ArrowRight />
              </Link>
              <Link to="/venues" className="btn btn--lg btn--ghost">
                See the venues
              </Link>
            </div>
            <dl className="hero__stats">
              <div>
                <dt>halls</dt>
                <dd>{stats?.venues ?? '–'}</dd>
              </div>
              <div>
                <dt>tables, courts &amp; lanes</dt>
                <dd>{stats?.resources ?? '–'}</dd>
              </div>
              <div>
                <dt>games played this week</dt>
                <dd>{stats?.bookingsThisWeek ?? '–'}</dd>
              </div>
            </dl>
          </div>
          <NextFreeBoard />
        </div>
        <Ticker activities={activities} />
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2 className="section__title">Twelve games. One account.</h2>
            <p className="section__lede">
              Every table and court in every hall is on the same calendar, so you can see what&apos;s free before you
              leave home.
            </p>
          </div>
          <div className="rack">
            {activities?.map((a) => (
              <Link key={a.id} to={`/play?activity=${a.slug}`} className="rack__tile" style={{ '--tile': a.color }}>
                <Glyph activity={a} size="lg" />
                <h3 style={{ marginTop: 28 }}>{a.name}</h3>
                <p>{a.blurb}</p>
                <div className="rack__meta">
                  <span>{a.resourceCount ? `from ${money(a.fromPrice)}` : 'coming soon'}</span>
                  <span>
                    {a.venueCount} {a.venueCount === 1 ? 'hall' : 'halls'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section__head">
            <h2 className="section__title">How it works</h2>
          </div>
          <div className="stubs">
            <div className="stub">
              <span className="stub__num">01</span>
              <div className="stub__rule" />
              <h3>Pick a game and a hall</h3>
              <p>Filter by what you want to play or by city. Every table shows its price, size and slot length.</p>
            </div>
            <div className="stub">
              <span className="stub__num">02</span>
              <div className="stub__rule" />
              <h3>Grab one to four slots</h3>
              <p>Weekday afternoons are cheapest. Evenings after 6pm and weekends are peak and marked on the grid.</p>
            </div>
            <div className="stub">
              <span className="stub__num">03</span>
              <div className="stub__rule" />
              <h3>Show your code at the desk</h3>
              <p>Pay from your wallet or at the counter. Change of plans? Cancel up to two hours before for a wallet refund.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section__head">
            <h2 className="section__title">The halls</h2>
            <Link to="/venues" className="btn btn--ghost">
              All venues <ArrowUpRight />
            </Link>
          </div>
          <div className="venue-grid venue-grid--pairs">
            {venues?.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="pitch">
          <div className="pitch__grid">
            <div>
              <span className="pitch__role">For the people behind the counter</span>
              <h2 style={{ marginTop: 18 }}>Running a hall? The console runs the floor.</h2>
              <p>
                A live board of every table, walk-in bookings in two taps, wallet top-ups, cash marked as paid, and
                numbers that add up at closing time.
              </p>
              <Link to="/sign-in" className="btn btn--lg" style={{ marginTop: 26 }}>
                Try the demo console <ArrowRight />
              </Link>
            </div>
            <div className="pitch__list">
              <div className="pitch__item">
                <span className="pitch__role">Desk</span>
                <div>
                  <strong>Front-desk board</strong>
                  <span>Check players in by code, take walk-ins, mark cash paid and top up wallets.</span>
                </div>
              </div>
              <div className="pitch__item">
                <span className="pitch__role">Manager</span>
                <div>
                  <strong>Tables, prices &amp; blocks</strong>
                  <span>Add tables, set peak pricing, and block a slot for a cloth change or a tournament.</span>
                </div>
              </div>
              <div className="pitch__item">
                <span className="pitch__role">Admin</span>
                <div>
                  <strong>People, games &amp; the log</strong>
                  <span>Assign roles and venues, add new game types and see who changed what.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
