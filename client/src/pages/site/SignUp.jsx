import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider.jsx';
import Field from '../../components/Field.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import AuthArt from './AuthArt.jsx';

export default function SignUp() {
  usePageTitle('Create account');
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const bind = (key) => ({ name: key, value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }), error: error?.fields?.[key] });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
      navigate(location.state?.from || '/play', { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <AuthArt quote="One account. Every table in town." cite="— and one wallet to pay for all of it" />
      <div className="auth__form">
        <div className="auth__panel">
          <span className="eyebrow">Takes a minute</span>
          <h1 style={{ marginTop: 8 }}>Create your account</h1>
          <form className="stack" style={{ marginTop: 26 }} onSubmit={submit} noValidate>
            {error && !error.fields && <div className="notice notice--bad">{error.message}</div>}
            <Field label="Your name" autoComplete="name" {...bind('name')} />
            <Field label="Email" type="email" autoComplete="email" {...bind('email')} />
            <Field label="Phone" type="tel" autoComplete="tel" hint="Optional. The desk uses it if you're running late." {...bind('phone')} />
            <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." {...bind('password')} />
            <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'} <ArrowRight />
            </button>
          </form>
          <p style={{ marginTop: 20 }} className="muted">
            Already have one? <Link to="/sign-in" state={location.state}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
