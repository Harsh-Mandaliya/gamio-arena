import { Link } from 'react-router';
import { MapPin } from 'lucide-react';
import { Glyph } from './ActivityIcon.jsx';
import VenueArt from './VenueArt.jsx';
import { clock, money } from '../lib/format.js';

export default function VenueCard({ venue }) {
  return (
    <Link to={`/venues/${venue.slug}`} className="venue-card card">
      <VenueArt venue={venue} />
      <div className="venue-card__body">
        <div className="spread">
          <span className="venue-card__where">
            <MapPin /> {venue.city}
          </span>
          <span className={`pill ${venue.openNow ? 'pill--ok' : ''}`}>
            {venue.openNow ? 'Open now' : `Opens ${clock(venue.opensAt)}`}
          </span>
        </div>
        <h3>{venue.name}</h3>
        <p className="muted" style={{ fontSize: 14.5 }}>
          {venue.tagline}
        </p>
        <div className="venue-card__foot">
          <div className="glyph-row">
            {venue.activities.map((a) => (
              <Glyph key={a.id} activity={a} size="sm" />
            ))}
          </div>
          {venue.fromPrice != null && <span className="mono" style={{ fontSize: 13 }}>from {money(venue.fromPrice)}</span>}
        </div>
      </div>
    </Link>
  );
}
