import { Link } from 'react-router';

export function LogoMark({ size = 34 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="var(--felt)" stroke="var(--line)" strokeWidth="2" />
      <circle cx="16" cy="16" r="8.5" fill="#fffcf5" />
      <path d="M8 13.4h16" stroke="var(--orange)" strokeWidth="3.2" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#17201b" strokeWidth="2" />
    </svg>
  );
}

export default function Logo({ to = '/', suffix = 'arena' }) {
  return (
    <Link to={to} className="logo" aria-label="Gamio Arena home">
      <LogoMark />
      <span className="logo__word">
        gamio<span className="logo__suffix">{suffix}</span>
      </span>
    </Link>
  );
}
