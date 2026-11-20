import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { CalendarCheck2, ChevronDown, LayoutDashboard, LogOut, Menu, UserRound, Wallet, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider.jsx';
import Logo from '../components/Logo.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { initials, money } from '../lib/format.js';
import { ROLE_LABEL, atLeast } from '../lib/roles.js';

const LINKS = [
  { to: '/play', label: 'Play' },
  { to: '/venues', label: 'Venues' },
  { to: '/contact', label: 'Contact' },
];

function AccountMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="account" ref={box}>
      <button className="account__trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="avatar">{initials(user.name)}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="account__menu card">
          <div className="account__who">
            <strong>{user.name}</strong>
            <span className="faint">{user.email}</span>
            <span className="pill pill--plain" style={{ marginTop: 6, alignSelf: 'flex-start' }}>
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          {atLeast(user, 'staff') && (
            <Link to="/console">
              <LayoutDashboard /> Console
            </Link>
          )}
          <Link to="/me/bookings">
            <CalendarCheck2 /> My bookings
          </Link>
          <Link to="/me/wallet">
            <Wallet /> Wallet <span className="account__value mono">{money(user.wallet)}</span>
          </Link>
          <Link to="/me/profile">
            <UserRound /> Profile
          </Link>
          <button onClick={onSignOut}>
            <LogOut /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteHeader() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    navigate('/', { replace: true });
    signOut();
  };

  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Logo />

        <nav className={`site-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className="site-nav__link">
              {l.label}
            </NavLink>
          ))}
          {!user && (
            <div className="site-nav__mobile-only">
              <Link to="/sign-in" className="btn btn--block">
                Sign in
              </Link>
              <Link to="/sign-up" className="btn btn--primary btn--block">
                Create account
              </Link>
            </div>
          )}
        </nav>

        <div className="site-header__actions">
          <ThemeToggle />
          {user ? (
            <>
              {atLeast(user, 'staff') && (
                <Link to="/console" className="btn btn--sm btn--dark hide-sm">
                  <LayoutDashboard /> Console
                </Link>
              )}
              <AccountMenu user={user} onSignOut={handleSignOut} />
            </>
          ) : (
            <>
              <Link to="/sign-in" className="btn btn--sm btn--ghost hide-sm">
                Sign in
              </Link>
              <Link to="/play" className="btn btn--sm btn--accent hide-sm">
                Book a slot
              </Link>
            </>
          )}
          <button
            className="icon-btn site-header__burger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
