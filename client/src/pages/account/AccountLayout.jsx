import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../../auth/AuthProvider.jsx';
import PageBand from '../../components/PageBand.jsx';
import { money } from '../../lib/format.js';

const TABS = [
  ['/me/bookings', 'Bookings'],
  ['/me/wallet', 'Wallet'],
  ['/me/profile', 'Profile'],
];

export default function AccountLayout() {
  const { user } = useAuth();
  return (
    <>
      <PageBand eyebrow={`Hi ${user.name.split(' ')[0]}`} title="Your games" icon="table-tennis">
        <p>
          {user.role === 'player' && (
            <>
              Wallet balance <strong style={{ color: 'var(--sun)' }}>{money(user.wallet)}</strong>.{' '}
            </>
          )}
          Show your booking code at any Gamio desk to check in.
        </p>
      </PageBand>
      <div className="wrap">
        <nav className="account-tabs seg" aria-label="Account">
          {TABS.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `chip ${isActive ? 'is-on' : ''}`} style={{ border: 0 }}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </>
  );
}
