import { Link } from 'react-router';
import Logo from '../components/Logo.jsx';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__grid">
        <div className="stack" style={{ '--gap': '14px' }}>
          <Logo />
          <p className="muted" style={{ maxWidth: '34ch' }}>
            Pool, table tennis, badminton, bowling and eight more games across four halls in Gujarat. One account, one wallet.
          </p>
        </div>
        <div className="site-footer__col">
          <h4>Play</h4>
          <Link to="/play">All games</Link>
          <Link to="/venues">Venues</Link>
          <Link to="/me/bookings">My bookings</Link>
        </div>
        <div className="site-footer__col">
          <h4>Help</h4>
          <Link to="/contact">Contact us</Link>
          <Link to="/contact?topic=events">Group &amp; office events</Link>
          <Link to="/sign-in">Staff sign in</Link>
        </div>
        <div className="site-footer__col">
          <h4>Hours</h4>
          <span className="muted">Most halls 10am to 11pm</span>
          <span className="muted">Courts open from 6am</span>
        </div>
      </div>
      <span className="site-footer__mark" aria-hidden="true">
        Gamio Arena
      </span>
      <div className="wrap site-footer__base">
        <span className="mono faint">© {new Date().getFullYear()} Gamio Arena</span>
        <span className="mono faint">Made for long rallies and longer frames.</span>
      </div>
    </footer>
  );
}
