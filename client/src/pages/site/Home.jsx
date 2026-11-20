import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { ActivityIcon, Glyph } from '../../components/ActivityIcon.jsx';
import Reveal from '../../components/Reveal.jsx';
import VenueCard from '../../components/VenueCard.jsx';
import GameShowcase from '../../components/showcase/GameShowcase.jsx';
import VideoHero from '../../components/showcase/VideoHero.jsx';
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

function SectionHead({ index, label, title, children }) {
  return (
    <Reveal className="section__head">
      <div>
        <span className="section__index">
          <b>{index}</b> {label}
        </span>
        <h2 className="section__title">{title}</h2>
      </div>
      {children}
    </Reveal>
  );
}

const STEPS = [
  ['Pick a game and a hall', 'Filter by what you want to play or by city. Every table shows its price, size and slot length.'],
  ['Grab one to four slots', 'Weekday afternoons are cheapest. Evenings after 6pm and weekends are peak and marked on the grid.'],
  ['Show your code at the desk', 'Pay from your wallet or at the counter. Change of plans? Cancel up to two hours before for a wallet refund.'],
];

const CONSOLE_ROLES = [
  ['Desk', 'Front-desk board', 'Check players in by code, take walk-ins, mark cash paid and top up wallets.'],
  ['Manager', 'Tables, prices & blocks', 'Add tables, set peak pricing, and block a slot for a cloth change or a tournament.'],
  ['Admin', 'People, games & the log', 'Assign roles and venues, add new game types and see who changed what.'],
];

export default function Home() {
  usePageTitle(null);
  const { data: activities } = useApi('/activities');
  const { data: venues } = useApi('/venues');

  return (
    <>
      <VideoHero />

      <section className="live">
        <div className="wrap live__grid">
          <Reveal className="live__copy">
            <span className="eyebrow live__eyebrow">
              <span className="live-dot" /> Live across Ahmedabad · Vadodara · Surat
            </span>
            <h2 className="live__title">
              Free in the next <span className="scribble">few hours.</span>
            </h2>
            <p className="live__lede">
              Every table, court and lane in every hall runs on one calendar. This board updates as people book, so what
              you see is what&apos;s actually open.
            </p>
            <div className="live__chips">
              {activities?.slice(0, 8).map((a) => (
                <Link key={a.id} to={`/play?activity=${a.slug}`} className="live__chip" style={{ '--chip': a.color }}>
                  <ActivityIcon name={a.icon} /> {a.name}
                </Link>
              ))}
              <Link to="/play" className="live__chip live__chip--all">
                All games <ArrowRight />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <NextFreeBoard />
          </Reveal>
        </div>
        <Ticker activities={activities} />
      </section>

      <GameShowcase />

      <section className="section">
        <div className="wrap">
          <SectionHead index="01" label="The games" title="Twelve games. One account.">
            <p className="section__lede">
              Pick what you feel like playing and we&apos;ll show every hall that has it, with live prices and slots.
            </p>
          </SectionHead>
          <div className="bento">
            {activities?.map((a, i) => (
              <Reveal
                key={a.id}
                delay={(i % 4) * 70}
                className={`bento__cell ${i === 0 ? 'bento__cell--hero' : ''} ${i === activities.length - 1 ? 'bento__cell--wide' : ''}`}
              >
                <Link to={`/play?activity=${a.slug}`} className="bento__tile" style={{ '--tile': a.color }}>
                  <span className="bento__art" aria-hidden="true">
                    <ActivityIcon name={a.icon} />
                  </span>
                  <span className="bento__top">
                    <span className="bento__count">{String(i + 1).padStart(2, '0')}</span>
                    <ArrowUpRight className="bento__arrow" />
                  </span>
                  <span className="bento__body">
                    <h3>{a.name}</h3>
                    <p>{a.blurb}</p>
                    <span className="bento__meta">
                      {a.resourceCount ? `from ${money(a.fromPrice)}` : 'coming soon'} · {a.venueCount}{' '}
                      {a.venueCount === 1 ? 'hall' : 'halls'}
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <SectionHead index="02" label="How it works" title="Three steps to the table." />
          <div className="stubs">
            {STEPS.map(([title, copy], i) => (
              <Reveal key={title} delay={i * 120} className="stub">
                <span className="stub__num">0{i + 1}</span>
                <div className="stub__rule" />
                <h3>{title}</h3>
                <p>{copy}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <SectionHead index="03" label="The halls" title="Four halls, one wallet.">
            <Link to="/venues" className="btn btn--ghost">
              All venues <ArrowUpRight />
            </Link>
          </SectionHead>
          <div className="venue-grid venue-grid--pairs">
            {venues?.map((v, i) => (
              <Reveal key={v.id} delay={(i % 2) * 120}>
                <VenueCard venue={v} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap">
        <Reveal className="pitch">
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
              {CONSOLE_ROLES.map(([role, title, copy]) => (
                <div key={role} className="pitch__item">
                  <span className="pitch__role">{role}</span>
                  <div>
                    <strong>{title}</strong>
                    <span>{copy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="wrap" style={{ marginTop: 'clamp(56px, 8vw, 96px)' }}>
        <Reveal className="closer">
          <span className="closer__ball" aria-hidden="true">
            <span>8</span>
          </span>
          <h2 className="closer__title">
            Your table&apos;s
            <br />
            waiting.
          </h2>
          <div className="closer__side">
            <p>Most halls have something free in the next hour. Book now, pay at the counter, play tonight.</p>
            <Link to="/play" className="vhero__btn">
              Find a free slot <ArrowUpRight />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
