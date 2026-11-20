import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider.jsx';
import Field from '../../components/Field.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { atLeast } from '../../lib/roles.js';
import AuthArt from './AuthArt.jsx';

const DEMO = [
  { label: 'Player', email: 'player@gamio.local' },
  { label: 'Front desk', email: 'desk@gamio.local' },
  { label: 'Manager', email: 'manager@gamio.local' },
  { label: 'Admin', email: 'admin@gamio.local' },
];

export default function SignIn() {
  usePageTitle('Sign in');
  const { signIn } = useAuth();
  const { data: meta } = useApi('/meta');
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(form.email, form.password);
      const from = location.state?.from;
      navigate(from || (atLeast(user, 'staff') ? '/console' : '/me/bookings'), { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <AuthArt quote="Your table's been waiting." cite="— every desk at Gamio, around 7pm" />
      <div className="auth__form">
        <div className="auth__panel">
          <span className="eyebrow">Welcome back</span>
          <h1 style={{ marginTop: 8 }}>Sign in</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Players, desk staff and managers all sign in here.
          </p>

          <form className="stack" style={{ marginTop: 26 }} onSubmit={submit} noValidate>
            {error && !error.fields?.email && <div className="notice notice--bad">{error.message}</div>}
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={error?.fields?.email}
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={error?.fields?.password}
              hint="Forgot it? Any front desk or admin can reset it for you."
              required
            />
            <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'} <ArrowRight />
            </button>
          </form>

          <p style={{ marginTop: 20 }} className="muted">
            New to Gamio? <Link to="/sign-up" state={location.state}>Create an account</Link>
          </p>

          {meta?.demoMode && (
            <div className="demo-accounts">
              <span className="eyebrow">Demo accounts · password gamio123</span>
              <div className="demo-accounts__list">
                {DEMO.map((d) => (
                  <button key={d.email} type="button" onClick={() => setForm({ email: d.email, password: 'gamio123' })}>
                    {d.label}
                    <small>{d.email}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
