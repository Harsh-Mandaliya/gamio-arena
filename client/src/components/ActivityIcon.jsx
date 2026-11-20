// Hand-drawn 24px glyphs for each game type. Same stroke language as the UI icons.

const GLYPHS = {
  pool: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="10.3" r="1.1" />
      <circle cx="12" cy="13.5" r="1.4" />
    </>
  ),
  snooker: (
    <>
      <path d="M12 3.5 20.5 18.5h-17z" />
      <circle cx="12" cy="10.5" r="1.8" />
      <circle cx="9.6" cy="14.6" r="1.8" />
      <circle cx="14.4" cy="14.6" r="1.8" />
    </>
  ),
  'table-tennis': (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="m14.6 14.6 5.4 5.4" strokeWidth="3" />
      <circle cx="19" cy="5" r="1.7" />
    </>
  ),
  badminton: (
    <>
      <circle cx="12" cy="19" r="2.3" />
      <path d="M10.4 17.3 6.5 5.5M13.6 17.3l3.9-11.8M12 16.7V4.6" />
      <path d="M6.5 5.5c3.6-1.6 7.4-1.6 11 0M8 10.2h8" />
    </>
  ),
  foosball: (
    <>
      <path d="M2.5 6.5h19" />
      <circle cx="12" cy="9.8" r="2" />
      <path d="M9.6 12.5h4.8l-.6 5h-3.6z" />
      <path d="M10.2 17.5 9 21M13.8 17.5 15 21" />
    </>
  ),
  'air-hockey': (
    <>
      <circle cx="9" cy="14.5" r="5.5" />
      <circle cx="9" cy="14.5" r="2" />
      <ellipse cx="18" cy="6.5" rx="3.3" ry="1.8" />
      <path d="M14.7 6.5v1.4c0 1 1.5 1.8 3.3 1.8s3.3-.8 3.3-1.8V6.5" />
    </>
  ),
  carrom: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="6.3" cy="6.3" r="1" />
      <circle cx="17.7" cy="6.3" r="1" />
      <circle cx="6.3" cy="17.7" r="1" />
      <circle cx="17.7" cy="17.7" r="1" />
    </>
  ),
  chess: (
    <>
      <circle cx="12" cy="6.2" r="2.6" />
      <path d="M9.3 11h5.4M10.3 11l-1.1 7.2h5.6L13.7 11" />
      <path d="M7 20.5h10" strokeWidth="2.4" />
    </>
  ),
  bowling: (
    <>
      <path d="M12 3c1.7 0 2.5 1.6 2.1 3.2-.3 1-.9 1.6-.9 2.6 0 1.3 2.3 3.2 2.3 6.6 0 2.8-1.4 5.1-3.5 5.1s-3.5-2.3-3.5-5.1c0-3.4 2.3-5.3 2.3-6.6 0-1-.6-1.6-.9-2.6C9.5 4.6 10.3 3 12 3z" />
      <path d="M10.3 8.4h3.4M10.4 10h3.2" />
    </>
  ),
  darts: (
    <>
      <circle cx="11" cy="13" r="8" />
      <circle cx="11" cy="13" r="4.4" />
      <circle cx="11" cy="13" r="1" />
      <path d="m11 13 9-9M17.2 4h2.8v2.8" />
    </>
  ),
  'box-cricket': (
    <>
      <path d="m3.5 20.5 3-3" strokeWidth="2.6" />
      <path d="m6.5 17.5 9.3-9.3 2.4 2.4-9.3 9.3z" />
      <circle cx="18.3" cy="18" r="2.4" />
    </>
  ),
  console: (
    <>
      <path d="M6.5 8h11a4 4 0 0 1 3.9 4.8l-.8 4a2.4 2.4 0 0 1-4.2 1.1L14.6 16H9.4l-1.8 1.9a2.4 2.4 0 0 1-4.2-1.1l-.8-4A4 4 0 0 1 6.5 8z" />
      <path d="M7.5 10.6v3M6 12.1h3" />
      <circle cx="16" cy="11.2" r=".6" />
      <circle cx="17.6" cy="13" r=".6" />
    </>
  ),
};

const FALLBACK = (
  <>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="9" cy="9" r="1" />
    <circle cx="15" cy="15" r="1" />
    <circle cx="12" cy="12" r="1" />
  </>
);

export const ICON_KEYS = Object.keys(GLYPHS);

export function ActivityIcon({ name, size = 24, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {GLYPHS[name] ?? FALLBACK}
    </svg>
  );
}

/** Coloured tile with the glyph inside. */
export function Glyph({ activity, size = '', title }) {
  return (
    <span
      className={`glyph ${size ? `glyph--${size}` : ''}`}
      style={{ '--glyph-color': activity?.color }}
      title={title ?? activity?.name}
    >
      <ActivityIcon name={activity?.icon} />
    </span>
  );
}
