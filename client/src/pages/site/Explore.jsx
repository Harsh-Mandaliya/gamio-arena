import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SearchX } from 'lucide-react';
import { ActivityIcon, Glyph } from '../../components/ActivityIcon.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { ErrorNote } from '../../components/PageLoader.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { money } from '../../lib/format.js';
import VenueCard from '../../components/VenueCard.jsx';

/** Shared by /play (game first) and /venues (hall first). */
export default function Explore({ mode = 'play' }) {
  const [params, setParams] = useSearchParams();
  const activity = params.get('activity') ?? '';
  const city = params.get('city') ?? '';
  const q = params.get('q') ?? '';

  const { data: meta } = useApi('/meta');
  const { data: activities } = useApi('/activities');
  const venues = useApi('/venues', { activity, city, q });

  const current = useMemo(() => activities?.find((a) => a.slug === activity), [activities, activity]);
  usePageTitle(current ? current.name : mode === 'play' ? 'Play' : 'Venues');

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">{mode === 'play' ? 'What are we playing?' : 'Four halls, one calendar'}</span>
        <h1 style={{ marginTop: 10 }}>{mode === 'play' ? 'Pick a game' : 'Find a hall'}</h1>
        <p>
          {mode === 'play'
            ? 'Choose a game to see every hall that has it, then pick a table and a time.'
            : 'Every Gamio hall, what it has, and when it’s open.'}
        </p>
      </header>

      <div className="filters">
        <div className="chip-scroll" role="group" aria-label="Game">
          <button className="chip" aria-pressed={!activity} onClick={() => set('activity', '')}>
            Everything
          </button>
          {activities?.map((a) => (
            <button key={a.id} className="chip" aria-pressed={activity === a.slug} onClick={() => set('activity', a.slug)}>
              <ActivityIcon name={a.icon} style={{ color: activity === a.slug ? 'inherit' : a.color }} /> {a.name}
            </button>
          ))}
        </div>

        <div className="filters__bar">
          <div className="input-icon">
            <Search />
            <input
              className="input"
              type="search"
              placeholder="Search by hall or area"
              defaultValue={q}
              onChange={(e) => set('q', e.target.value.trim())}
              aria-label="Search venues"
            />
          </div>
          <div className="seg" role="group" aria-label="City">
            <button aria-pressed={!city} onClick={() => set('city', '')}>
              All cities
            </button>
            {meta?.cities.map((c) => (
              <button key={c} aria-pressed={city === c} onClick={() => set('city', c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {current && (
        <div className="activity-banner" style={{ '--tile': current.color }}>
          <Glyph activity={current} size="lg" />
          <div style={{ flex: 1 }}>
            <h2>{current.name}</h2>
            <p className="muted">{current.blurb}</p>
          </div>
          {current.fromPrice != null && (
            <div className="mono hide-sm" style={{ textAlign: 'right', fontSize: 13 }}>
              from
              <br />
              <strong style={{ fontSize: 22 }}>{money(current.fromPrice)}</strong>
            </div>
          )}
        </div>
      )}

      <ErrorNote error={venues.error} onRetry={venues.reload} />

      {venues.loading && !venues.data ? (
        <div className="venue-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 380, borderRadius: 20 }} />
          ))}
        </div>
      ) : venues.data?.length ? (
        <div className="venue-grid">
          {venues.data.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<SearchX />} title="No hall matches that">
          Try another city or clear the search. New halls are added as they open.
        </EmptyState>
      )}
    </div>
  );
}
