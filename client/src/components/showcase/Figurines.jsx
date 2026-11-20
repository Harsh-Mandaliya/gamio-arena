// Chunky, toy-like renders of four games for the home showcase.
// All drawn in a 300 x 500 box (0.6 : 1) and anchored to the bottom edge,
// so they sit on the "floor" of the hero like figurines on a shelf.

const OUTLINE = '#17201b';

export function PoolFigure() {
  return (
    <svg viewBox="0 0 300 500" aria-hidden="true">
      <defs>
        <radialGradient id="fig-8ball" cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#4a4f4c" />
          <stop offset="0.45" stopColor="#1a1d1b" />
          <stop offset="1" stopColor="#050606" />
        </radialGradient>
        <linearGradient id="fig-cue" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f4dcb0" />
          <stop offset="0.5" stopColor="#d9a866" />
          <stop offset="1" stopColor="#8a5a2b" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="488" rx="118" ry="12" fill="rgb(0 0 0 / 0.22)" />
      {/* cue leaning on the ball */}
      <g transform="rotate(-22 150 300)">
        <rect x="139" y="40" width="22" height="330" rx="11" fill="url(#fig-cue)" stroke={OUTLINE} strokeWidth="5" />
        <rect x="139" y="40" width="22" height="26" rx="10" fill="#2f6fde" stroke={OUTLINE} strokeWidth="5" />
        <rect x="139" y="250" width="22" height="120" rx="6" fill="#3b2a1a" stroke={OUTLINE} strokeWidth="5" />
      </g>
      <circle cx="150" cy="378" r="108" fill="url(#fig-8ball)" stroke={OUTLINE} strokeWidth="6" />
      <circle cx="134" cy="350" r="44" fill="#fffcf5" stroke={OUTLINE} strokeWidth="5" />
      <text x="134" y="368" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="52" fill={OUTLINE}>
        8
      </text>
      <ellipse cx="108" cy="318" rx="26" ry="14" fill="#fff" opacity="0.28" transform="rotate(-30 108 318)" />
    </svg>
  );
}

export function PaddleFigure() {
  return (
    <svg viewBox="0 0 300 500" aria-hidden="true">
      <defs>
        <radialGradient id="fig-rubber" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ff7a5c" />
          <stop offset="0.6" stopColor="#d9362b" />
          <stop offset="1" stopColor="#8f1d17" />
        </radialGradient>
        <linearGradient id="fig-handle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f2c98a" />
          <stop offset="1" stopColor="#a8723a" />
        </linearGradient>
        <radialGradient id="fig-ttball" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffb347" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="488" rx="96" ry="11" fill="rgb(0 0 0 / 0.22)" />
      <g transform="rotate(14 150 300)">
        <rect x="128" y="300" width="44" height="182" rx="18" fill="url(#fig-handle)" stroke={OUTLINE} strokeWidth="6" />
        <path d="M134 340h32M134 380h32M134 420h32" stroke="#8a5a2b" strokeWidth="4" />
        <circle cx="150" cy="200" r="122" fill="#1b1b1b" stroke={OUTLINE} strokeWidth="6" />
        <circle cx="150" cy="200" r="110" fill="url(#fig-rubber)" />
        <circle cx="150" cy="200" r="110" fill="none" stroke="rgb(0 0 0 / 0.15)" strokeWidth="10" strokeDasharray="2 10" />
        <ellipse cx="110" cy="150" rx="40" ry="22" fill="#fff" opacity="0.22" transform="rotate(-35 110 150)" />
      </g>
      <circle cx="252" cy="70" r="30" fill="url(#fig-ttball)" stroke={OUTLINE} strokeWidth="5" />
    </svg>
  );
}

export function BowlingFigure() {
  return (
    <svg viewBox="0 0 300 500" aria-hidden="true">
      <defs>
        <linearGradient id="fig-pin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f1ece2" />
          <stop offset="1" stopColor="#c9c1b2" />
        </linearGradient>
        <radialGradient id="fig-bball" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#8a7cff" />
          <stop offset="0.55" stopColor="#4b3cc9" />
          <stop offset="1" stopColor="#21196b" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="488" rx="120" ry="12" fill="rgb(0 0 0 / 0.22)" />
      <path
        d="M150 22c30 0 42 28 36 56-4 18-14 30-14 48 0 26 46 70 46 150 0 90-30 206-68 206s-68-116-68-206c0-80 46-124 46-150 0-18-10-30-14-48-6-28 6-56 36-56z"
        fill="url(#fig-pin)"
        stroke={OUTLINE}
        strokeWidth="6"
      />
      <path d="M118 112c20 6 44 6 64 0M114 136c24 7 48 7 72 0" stroke="#e03131" strokeWidth="11" fill="none" />
      <ellipse cx="126" cy="70" rx="12" ry="22" fill="#fff" opacity="0.8" />
      <circle cx="90" cy="420" r="70" fill="url(#fig-bball)" stroke={OUTLINE} strokeWidth="6" />
      <circle cx="74" cy="398" r="8" fill={OUTLINE} />
      <circle cx="98" cy="392" r="8" fill={OUTLINE} />
      <circle cx="88" cy="418" r="8" fill={OUTLINE} />
      <ellipse cx="62" cy="378" rx="16" ry="9" fill="#fff" opacity="0.3" transform="rotate(-30 62 378)" />
    </svg>
  );
}

export function ShuttleFigure() {
  return (
    <svg viewBox="0 0 300 500" aria-hidden="true">
      <defs>
        <radialGradient id="fig-cork" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff6e0" />
          <stop offset="1" stopColor="#d9b98a" />
        </radialGradient>
        <linearGradient id="fig-feather" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6e0d4" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="488" rx="84" ry="11" fill="rgb(0 0 0 / 0.22)" />
      {/* feather skirt */}
      <path d="M150 380 40 70c70-34 150-34 220 0z" fill="url(#fig-feather)" stroke={OUTLINE} strokeWidth="6" strokeLinejoin="round" />
      <path d="M150 380 86 60M150 380V50M150 380l64-320" stroke={OUTLINE} strokeWidth="4" opacity="0.55" />
      <path d="M62 132c58-22 118-22 176 0M84 206c44-14 88-14 132 0" stroke="#2f6fde" strokeWidth="9" fill="none" />
      <path d="M40 70c70-34 150-34 220 0" stroke={OUTLINE} strokeWidth="6" fill="none" />
      {/* cork */}
      <path d="M100 386h100v14c0 50-22 82-50 82s-50-32-50-82z" fill="url(#fig-cork)" stroke={OUTLINE} strokeWidth="6" />
      <rect x="94" y="370" width="112" height="26" rx="10" fill="#2f6fde" stroke={OUTLINE} strokeWidth="6" />
      <ellipse cx="128" cy="430" rx="10" ry="18" fill="#fff" opacity="0.5" />
    </svg>
  );
}
