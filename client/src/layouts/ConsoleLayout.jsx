import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Activity,
  ArrowUpRight,
  Building2,
  Gamepad2,
  Inbox,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  MonitorPlay,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { LogoMark } from '../components/Logo.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { initials } from '../lib/format.js';
import { ROLE_LABEL, atLeast } from '../lib/roles.js';

const NAV = [
  {
    group: 'Today',
    items: [
      { to: '/console', label: 'Overview', icon: LayoutGrid, end: true },
      { to: '/console/desk', label: 'Front desk', icon: MonitorPlay },
      { to: '/console/bookings', label: 'Bookings', icon: ListChecks },
      { to: '/console/wallets', label: 'Wallets', icon: Wallet },
    ],
  },
  {
    group: 'Manage',
    role: 'manager',
    items: [{ to: '/console/venues', label: 'Venues & tables', icon: Building2 }],
  },
  {
    group: 'Admin',
    role: 'admin',
    items: [
      { to: '/console/people', label: 'People & roles', icon: Users },
      { to: '/console/games', label: 'Game types', icon: Gamepad2 },
      { to: '/console/inbox', label: 'Inbox', icon: Inbox },
      { to: '/console/activity', label: 'Activity log', icon: Activity },
    ],
  },
];

export default function ConsoleLayout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="console">
      <aside className={`console-side ${open ? 'is-open' : ''}`}>
        <div className="console-side__top">
          <Link to="/console" className="console-brand">
            <LogoMark size={32} />
            <span>
              gamio<em>console</em>
            </span>
          </Link>
          <button className="icon-btn console-side__close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X />
          </button>
        </div>

        <nav className="console-nav" aria-label="Console">
          {NAV.filter((g) => !g.role || atLeast(user, g.role)).map((g) => (
            <div key={g.group} className="console-nav__group">
              <span className="console-nav__label">{g.group}</span>
              {g.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className="console-nav__link">
                  <Icon /> {label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="console-nav__group">
            <span className="console-nav__label">Site</span>
            <Link to="/" className="console-nav__link">
              <ArrowUpRight /> Player site
            </Link>
          </div>
        </nav>

        <div className="console-me">
          <span className="avatar" style={{ '--avatar-bg': 'var(--sun)' }}>
            {initials(user.name)}
          </span>
          <div className="console-me__who">
            <strong>{user.name}</strong>
            <span>{user.venue ? `${ROLE_LABEL[user.role]} · ${user.venue.name}` : ROLE_LABEL[user.role]}</span>
          </div>
          <button
            className="console-me__out"
            onClick={() => {
              navigate('/', { replace: true });
              signOut();
            }}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {open && <div className="console-scrim" onClick={() => setOpen(false)} />}

      <div className="console-main">
        <header className="console-bar">
          <button className="icon-btn console-bar__burger" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <span className="console-bar__crumb mono">{location.pathname.replace('/console', 'console').replaceAll('/', ' / ')}</span>
          <div className="row" style={{ marginLeft: 'auto', '--gap': '8px' }}>
            <ThemeToggle />
          </div>
        </header>
        <div className="console-page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
