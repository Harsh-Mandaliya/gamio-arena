import { useState } from 'react';
import { patch, post } from '../../api/client.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import Field from '../../components/Field.jsx';
import { useToast } from '../../components/Toasts.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { ROLE_LABEL } from '../../lib/roles.js';

export default function Profile() {
  usePageTitle('Profile');
  const { user, refresh } = useAuth();
  const toast = useToast();

  const [details, setDetails] = useState({ name: user.name, phone: user.phone ?? '' });
  const [detailsError, setDetailsError] = useState(null);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwError, setPwError] = useState(null);
  const [busy, setBusy] = useState('');

  const saveDetails = async (e) => {
    e.preventDefault();
    setBusy('details');
    setDetailsError(null);
    try {
      await patch('/auth/me', details);
      await refresh();
      toast.ok('Profile saved');
    } catch (err) {
      setDetailsError(err);
    } finally {
      setBusy('');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setBusy('pw');
    setPwError(null);
    try {
      await post('/auth/me/password', pw);
      setPw({ current: '', next: '' });
      toast.ok('Password changed');
    } catch (err) {
      setPwError(err);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="form-grid" style={{ alignItems: 'start', gap: 24 }}>
      <form className="card" onSubmit={saveDetails} noValidate>
        <div className="card__head">
          <h2>Your details</h2>
          <span className="pill pill--plain">{ROLE_LABEL[user.role]}</span>
        </div>
        <div className="card__body stack">
          <Field label="Email" name="email" value={user.email} disabled hint="Email can't be changed here." />
          <Field label="Name" name="name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} error={detailsError?.fields?.name} />
          <Field label="Phone" name="phone" type="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} error={detailsError?.fields?.phone} />
          <div>
            <button className="btn btn--primary" disabled={busy === 'details'}>
              {busy === 'details' ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </div>
      </form>

      <form className="card" onSubmit={savePassword} noValidate>
        <div className="card__head">
          <h2>Password</h2>
        </div>
        <div className="card__body stack">
          {pwError && !pwError.fields && <div className="notice notice--bad">{pwError.message}</div>}
          <Field label="Current password" name="current" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwError?.fields?.current} />
          <Field label="New password" name="next" type="password" autoComplete="new-password" hint="At least 8 characters." value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwError?.fields?.next} />
          <div>
            <button className="btn" disabled={busy === 'pw'}>
              {busy === 'pw' ? 'Updating…' : 'Change password'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
