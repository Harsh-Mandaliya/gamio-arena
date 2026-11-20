import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { patch, post } from '../../api/client.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import Field from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PageLoader, { ErrorNote } from '../../components/PageLoader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { initials, money, relative } from '../../lib/format.js';
import { ROLE_LABEL, ROLE_TONE } from '../../lib/roles.js';

const ROLES = ['admin', 'manager', 'staff', 'player'];

function PersonForm({ person, venues, onClose, onSaved }) {
  const toast = useToast();
  const { user } = useAuth();
  const creating = !person;
  const [form, setForm] = useState(
    person
      ? { role: person.role, venueId: person.venue?.id ?? '', isActive: person.isActive, password: '' }
      : { name: '', email: '', phone: '', role: 'staff', venueId: venues?.[0]?.id ?? '', password: '' },
  );
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const bind = (key) => ({ name: key, value: form[key] ?? '', onChange: (e) => setForm({ ...form, [key]: e.target.value }), error: error?.fields?.[key] });
  const self = person?.id === user.id;

  const save = async () => {
    setBusy(true);
    setError(null);
    const venueId = form.role === 'staff' && form.venueId ? Number(form.venueId) : null;
    try {
      if (creating) {
        await post('/console/users', { name: form.name, email: form.email, phone: form.phone || undefined, role: form.role, venueId, password: form.password });
        toast.ok(`${form.name} added as ${ROLE_LABEL[form.role].toLowerCase()}`);
      } else {
        await patch(`/console/users/${person.id}`, { role: form.role, venueId, isActive: form.isActive, ...(form.password && { password: form.password }) });
        toast.ok(`${person.name} updated`);
      }
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={creating ? 'Add a person' : person.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && !error.fields && <div className="notice notice--bad">{error.message}</div>}
        {creating ? (
          <>
            <Field label="Name" {...bind('name')} />
            <div className="form-grid">
              <Field label="Email" type="email" {...bind('email')} />
              <Field label="Phone" type="tel" {...bind('phone')} />
            </div>
          </>
        ) : (
          <p className="muted">
            {person.email}
            {person.phone ? ` · ${person.phone}` : ''}
          </p>
        )}
        <div className="form-grid">
          <Field label="Role" as="select" {...bind('role')} disabled={self} hint={self ? "You can't change your own role." : ''}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Field>
          {form.role === 'staff' && (
            <Field label="Home venue" as="select" {...bind('venueId')}>
              {venues?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Field>
          )}
        </div>
        {form.role === 'manager' && <p className="faint" style={{ fontSize: 13.5 }}>Assign their venues from Venues &amp; tables → Edit details.</p>}
        <Field
          label={creating ? 'Password' : 'Reset password'}
          type="text"
          autoComplete="off"
          {...bind('password')}
          hint={creating ? 'At least 8 characters. Share it with them in person.' : 'Leave blank to keep the current one.'}
        />
        {!creating && !self && (
          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Account active
          </label>
        )}
      </div>
    </Modal>
  );
}

export default function People() {
  usePageTitle('People');
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const { data, error, loading, reload } = useApi('/console/users', { role, q });
  const { data: venues } = useApi('/console/my-venues');

  return (
    <>
      <div className="c-head">
        <div>
          <h1>People &amp; roles</h1>
          <p>Who can sign in, what they can see, and which hall they work at.</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setModal({})}>
          <UserPlus /> Add person
        </button>
      </div>

      <section className="card">
        <div className="card__head" style={{ flexWrap: 'wrap' }}>
          <div className="seg">
            <button aria-pressed={!role} onClick={() => setRole('')}>
              Everyone
            </button>
            {ROLES.map((r) => (
              <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <div className="input-icon" style={{ flex: '0 1 260px' }}>
            <Search />
            <input className="input input--sm" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" />
          </div>
        </div>
        <ErrorNote error={error} onRetry={reload} />
        {loading && !data ? (
          <PageLoader />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Where</th>
                  <th className="num">Bookings</th>
                  <th className="num">Wallet</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((p) => (
                  <tr key={p.id} className="is-clickable" onClick={() => setModal({ person: p })} style={{ opacity: p.isActive ? 1 : 0.5 }}>
                    <td>
                      <span className="row" style={{ '--gap': '10px', flexWrap: 'nowrap' }}>
                        <span className="avatar">{initials(p.name)}</span>
                        <span style={{ minWidth: 0 }}>
                          <strong>{p.name}</strong>
                          <span className="faint" style={{ display: 'block', fontSize: 12.5 }}>
                            {p.email}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={`pill pill--${ROLE_TONE[p.role]}`}>{ROLE_LABEL[p.role]}</span>
                      {!p.isActive && <span className="faint"> · paused</span>}
                    </td>
                    <td className="muted">{p.venue?.name ?? p.manages ?? (p.role === 'admin' ? 'All venues' : '—')}</td>
                    <td className="num mono">{p.bookings}</td>
                    <td className="num mono">{p.role === 'player' ? money(p.wallet) : '—'}</td>
                    <td className="faint" style={{ whiteSpace: 'nowrap' }}>
                      {relative(p.lastLoginAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <PersonForm
          person={modal.person}
          venues={venues}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}
    </>
  );
}
