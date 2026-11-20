import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../../auth/AuthProvider.jsx';

export default function AccountLayout() {
  const { user } = useAuth();
  return (
    <div className="wrap">
      <header className="page-head" style={{ paddingBottom: 20 }}>
        <span className="eyebrow">Hi {user.name.split(' ')[0]}</span>
        <h1 style={{ marginTop: 10 }}>Your games</h1>
      </header>
      <nav className="account-tabs seg" aria-label="Account">
        <NavLink to="/me/bookings" className={({ isActive }) => `chip ${isActive ? 'is-on' : ''}`} style={{ border: 0 }}>
          Bookings
        </NavLink>
        <NavLink to="/me/wallet" className={({ isActive }) => `chip ${isActive ? 'is-on' : ''}`} style={{ border: 0 }}>
          Wallet
        </NavLink>
        <NavLink to="/me/profile" className={({ isActive }) => `chip ${isActive ? 'is-on' : ''}`} style={{ border: 0 }}>
          Profile
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
