import { Link } from 'react-router';
import { usePageTitle } from '../../hooks/usePageTitle.js';

export default function NotFound() {
  usePageTitle('Not found');
  return (
    <div className="wrap lost">
      <span className="lost__num" aria-hidden="true">
        404
      </span>
      <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)' }}>Scratch.</h1>
      <p className="muted" style={{ maxWidth: '40ch' }}>
        That one went in the wrong pocket. The page you were after isn&apos;t here.
      </p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn btn--primary">
          Back to the lobby
        </Link>
        <Link to="/play" className="btn">
          Find a game
        </Link>
      </div>
    </div>
  );
}
