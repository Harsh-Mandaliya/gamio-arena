import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { ArrowUpRight, CalendarCheck2, ChevronDown, LayoutDashboard, LogOut, UserRound, Wallet, X } from 'lucide-react';
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

function MobileMenu({ open, onClose, user, onSignOut }) {
  const items = [
    ...LINKS.map((l) => ({ key: l.to, node: <Link to={l.to} onClick={onClose}>{l.label}</Link> })),
    ...(user
      ? [
          ...(atLeast(user, 'staff') ? [{ key: 'console', node: <Link to="/console" onClick={onClose}>Console</Link> }] : []),
          { key: 'mine', node: <Link to="/me/bookings" onClick={onClose}>My games</Link> },
          ...(user.role === 'player' ? [{ key: 'wallet', node: <Link to="/me/wallet" onClick={onClose}>Wallet · {money(user.wallet)}</Link> }] : []),
          { key: 'out', node: <button className="menu-overlay__link" onClick={() => { onClose(); onSignOut(); }}>Sign out</button> },
        ]
      : [{ key: 'in', node: <Link to="/sign-in" onClick={onClose}>Sign in</Link> }]),
  ];

  return createPortal(
    <div className={`menu-overlay ${open ? 'is-open' : ''}`} aria-hidden={!open} role="dialog" aria-label="Menu">
      <div className="menu-overlay__top">
        <Logo />
        <button className="menu-overlay__close" onClick={onClose} aria-label="Close menu">
          <X size={28} />
        </button>
      </div>
      <nav className="menu-overlay__links" aria-label="Mobile">
        {items.map((item, i) => (
          <div key={item.key} className="menu-overlay__item" style={{ transitionDelay: open ? `${i * 80 + 100}ms` : '0ms' }}>
            {item.node}
          </div>
        ))}
        <div className="menu-overlay__item" style={{ transitionDelay: open ? `${items.length * 80 + 100}ms` : '0ms' }}>
          <Link to="/play" className="menu-overlay__cta" onClick={onClose}>
            Book a slot <ArrowUpRight />
          </Link>
        </div>
      </nav>
    </div>,
    document.body,
  );
}

export default function SiteHeader() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const onHome = location.pathname === '/';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // On the home page the header floats over the video until you scroll past it.
  useEffect(() => {
    if (!onHome) return undefined;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onHome]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }, [menuOpen]);

  const handleSignOut = () => {
    navigate('/', { replace: true });
    signOut();
  };

  return (
    <header className={`site-header ${onHome && !scrolled ? 'is-overlay' : ''}`}>
      <div className="wrap site-header__inner">
        <Logo />

        <nav className="site-nav" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className="site-nav__link">
              {l.label}
            </NavLink>
          ))}
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
              <span className="hide-sm">
                <AccountMenu user={user} onSignOut={handleSignOut} />
              </span>
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
          <button className="burger" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} user={user} onSignOut={handleSignOut} />
    </header>
  );
}
