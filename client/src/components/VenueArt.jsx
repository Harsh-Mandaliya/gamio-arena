import { ActivityIcon } from './ActivityIcon.jsx';

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Generated cover art for a venue: the venue's accent, a court-line pattern
 * picked from its slug, and its game glyphs scattered like stickers.
 * No stock photos, and every venue looks different.
 */
export default function VenueArt({ venue, className = '', showIcons = true }) {
  const seed = hash(venue.slug || venue.name || 'gamio');
  const pattern = seed % 3;
  const icons = (venue.activities ?? []).slice(0, 4);
  const id = `va-${venue.slug || seed}`;

  const spots = [
    { x: 64, y: 30, r: -12 },
    { x: 80, y: 62, r: 9 },
    { x: 46, y: 70, r: -6 },
    { x: 26, y: 34, r: 14 },
  ];

  return (
    <div className={`venue-art ${className}`} style={{ '--accent': venue.accent }} aria-hidden="true">
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={`${id}-dots`} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="rgb(255 255 255 / 0.18)" />
          </pattern>
        </defs>
        <rect width="400" height="240" fill="var(--accent)" />
        <rect width="400" height="240" fill={`url(#${id}-dots)`} />
        <g fill="none" stroke="rgb(255 255 255 / 0.32)" strokeWidth="3">
          {pattern === 0 && (
            <>
              {/* pool table: rails and pockets */}
              <rect x="40" y="38" width="320" height="164" rx="18" />
              <line x1="120" y1="38" x2="120" y2="202" />
              <circle cx="280" cy="120" r="26" />
              {[[40, 38], [200, 38], [360, 38], [40, 202], [200, 202], [360, 202]].map(([x, y]) => (
                <circle key={`${x}${y}`} cx={x} cy={y} r="11" fill="rgb(0 0 0 / 0.18)" />
              ))}
            </>
          )}
          {pattern === 1 && (
            <>
              {/* court lines */}
              <rect x="30" y="30" width="340" height="180" />
              <line x1="200" y1="30" x2="200" y2="210" />
              <line x1="30" y1="70" x2="370" y2="70" />
              <line x1="30" y1="170" x2="370" y2="170" />
              <line x1="120" y1="70" x2="120" y2="170" />
              <line x1="280" y1="70" x2="280" y2="170" />
            </>
          )}
          {pattern === 2 && (
            <>
              {/* lanes and target rings */}
              {[60, 110, 160, 210].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} strokeDasharray="14 10" />
              ))}
              <circle cx="320" cy="120" r="70" />
              <circle cx="320" cy="120" r="42" />
              <circle cx="320" cy="120" r="14" fill="rgb(255 255 255 / 0.2)" />
            </>
          )}
        </g>
      </svg>
      {showIcons &&
        icons.map((a, i) => (
          <span
            key={a.slug}
            className="venue-art__sticker"
            style={{
              left: `${spots[i].x}%`,
              top: `${spots[i].y}%`,
              '--tilt': `${spots[i].r + ((seed >> i) % 7) - 3}deg`,
              '--glyph-color': a.color,
            }}
          >
            <ActivityIcon name={a.icon} />
          </span>
        ))}
    </div>
  );
}
