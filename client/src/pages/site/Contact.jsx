import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarHeart, Clock3, MessageSquareText, PartyPopper } from 'lucide-react';
import { post } from '../../api/client.js';
import Field from '../../components/Field.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';

const TOPICS = [
  ['general', 'General question'],
  ['booking', 'About a booking'],
  ['events', 'Group or office event'],
  ['partnership', 'Coaching or partnership'],
];

export default function Contact() {
  usePageTitle('Contact');
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    topic: TOPICS.some(([k]) => k === params.get('topic')) ? params.get('topic') : 'general',
    message: '',
  });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const bind = (key) => ({ name: key, value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }), error: error?.fields?.[key] });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post('/enquiries', form);
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">Say hello</span>
        <h1 style={{ marginTop: 10 }}>Talk to a human</h1>
        <p>Questions about a booking, a birthday on the turf, or a weekly slot for your club. We read everything.</p>
      </header>

      <div className="contact-grid">
        <div className="card">
          <div className="card__body">
            {sent ? (
              <div className="empty">
                <div className="empty__art">
                  <PartyPopper />
                </div>
                <h3>Got it, thanks {form.name.split(' ')[0]}</h3>
                <p>Someone from the team will get back to {form.email} within a day.</p>
                <button
                  className="btn"
                  onClick={() => {
                    setSent(false);
                    setForm({ ...form, message: '' });
                  }}
                >
                  Send another
                </button>
              </div>
            ) : (
              <form className="stack" onSubmit={submit} noValidate>
                {error && !error.fields && <div className="notice notice--bad">{error.message}</div>}
                <div className="form-grid">
                  <Field label="Name" autoComplete="name" {...bind('name')} />
                  <Field label="Email" type="email" autoComplete="email" {...bind('email')} />
                </div>
                <Field label="What's it about?" as="select" {...bind('topic')}>
                  {TOPICS.map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </Field>
                <Field label="Message" as="textarea" rows={6} {...bind('message')} />
                <div>
                  <button className="btn btn--primary btn--lg" disabled={busy}>
                    {busy ? 'Sending…' : 'Send message'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="contact-cards">
          <div className="card card__body row" style={{ alignItems: 'flex-start', '--gap': '14px' }}>
            <span className="glyph" style={{ '--glyph-color': 'var(--orange)' }}>
              <CalendarHeart />
            </span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 19 }}>Parties &amp; office nights</h3>
              <p className="muted" style={{ marginTop: 4 }}>
                We can hold several tables or a whole floor for groups of 10 to 60.
              </p>
            </div>
          </div>
          <div className="card card__body row" style={{ alignItems: 'flex-start', '--gap': '14px' }}>
            <span className="glyph" style={{ '--glyph-color': 'var(--chalk)' }}>
              <MessageSquareText />
            </span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 19 }}>Booking help</h3>
              <p className="muted" style={{ marginTop: 4 }}>
                Mention your booking code (it starts with GA-) and we&apos;ll find it fast.
              </p>
            </div>
          </div>
          <div className="card card__body row" style={{ alignItems: 'flex-start', '--gap': '14px' }}>
            <span className="glyph">
              <Clock3 />
            </span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 19 }}>Desk hours</h3>
              <p className="muted" style={{ marginTop: 4 }}>
                Every hall&apos;s desk is staffed from opening to close. Courts at Vesu open at 6am.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
