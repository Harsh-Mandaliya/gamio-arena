import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider.jsx';
import { atLeast } from '../lib/roles.js';
import PageLoader from '../components/PageLoader.jsx';

export default function RequireRole({ role = 'player', children }) {
  const { user, ready, signedOut } = useAuth();
  const location = useLocation();

  if (!ready) return <PageLoader />;
  if (!user && signedOut) return <Navigate to="/" replace />;
  if (!user) return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  if (!atLeast(user, role)) return <Navigate to="/" replace />;
  return children;
}
