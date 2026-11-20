import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CalendarOff, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { del, patch, post } from '../../api/client.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { Glyph } from '../../components/ActivityIcon.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Field from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PageLoader, { ErrorNote } from '../../components/PageLoader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import VenueArt from '../../components/VenueArt.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { clock, dayLabel, isoDate, money } from '../../lib/format.js';
import { atLeast } from '../../lib/roles.js';

const SLOT_LENGTHS = [30, 45, 60, 90, 120];
const ACCENTS = ['#12684f', '#2f6fde', '#d6336c', '#e2572b', '#7a4bd1', '#c98a2b', '#11a3b5', '#3d3d3d'];

function useForm(initial) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const bind = (key, map = (v) => v) => ({
    name: key,
    value: form[key] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [key]: map(e.target.value) })),
    error: error?.fields?.[key],
  });
  return { form, setForm, error, setError, bind };
}

function VenueForm({ venue, isAdmin, managers, onClose, onSaved }) {
  const toast = useToast();
  const creating = !venue;
  const { form, setForm, error, setError, bind } = useForm(
    venue
      ? { ...venue, managerId: venue.manager?.id ?? null }
      : { name: '', city: '', address: '', tagline: '', description: '', phone: '', opensAt: '10:00', closesAt: '22:00', accent: ACCENTS[0], managerId: null, isActive: true },
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    const body = {
      tagline: form.tagline || undefined,
      description: form.description || undefined,
      address: form.address,
      phone: form.phone || undefined,
      opensAt: form.opensAt,
      closesAt: form.closesAt,
      accent: form.accent,
      ...(isAdmin && { name: form.name, city: form.city, managerId: form.managerId ? Number(form.managerId) : null, isActive: form.isActive }),
    };
    try {
      if (creating) await post('/console/venues', body);
      else await patch(`/console/venues/${venue.id}`, body);
      toast.ok(creating ? 'Venue created' : 'Venue saved');
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      wide
      title={creating ? 'New venue' : `Edit ${venue.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save venue'}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && !error.fields && <div className="notice notice--bad">{error.message}</div>}
        {isAdmin && (
          <div className="form-grid">
            <Field label="Name" {...bind('name')} />
            <Field label="City" {...bind('city')} />
            <Field label="Manager" as="select" {...bind('managerId')}>
              <option value="">No manager</option>
              {managers?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Field>
          </div>
        )}
        <Field label="Tagline" {...bind('tagline')} placeholder="One line players see on the card" />
        <Field label="Address" {...bind('address')} />
        <Field label="Description" as="textarea" rows={4} {...bind('description')} />
        <div className="form-grid">
          <Field label="Opens" type="time" {...bind('opensAt')} />
          <Field label="Closes" type="time" {...bind('closesAt')} />
          <Field label="Phone" type="tel" {...bind('phone')} />
        </div>
        <div className="field">
          <span className="field__label">Accent colour</span>
          <div className="row" style={{ '--gap': '8px' }}>
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, accent: c })}
                aria-label={c}
                aria-pressed={form.accent === c}
                style={{ width: 34, height: 34, borderRadius: 10, background: c, border: form.accent === c ? '3px solid var(--ink)' : '1.5px solid var(--line)' }}
              />
            ))}
          </div>
        </div>
        {isAdmin && !creating && (
          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Taking bookings
          </label>
        )}
      </div>
    </Modal>
  );
}

function ResourceForm({ venueId, resource, activities, onClose, onSaved }) {
  const toast = useToast();
  const { form, setForm, error, setError, bind } = useForm(
    resource
      ? { activityId: resource.activity.id, name: resource.name, capacity: resource.capacity, slotMinutes: resource.slotMinutes, price: resource.price, peakPrice: resource.peakPrice ?? '', notes: resource.notes ?? '', isActive: resource.isActive }
      : { activityId: activities?.[0]?.id, name: '', capacity: 4, slotMinutes: 60, price: 200, peakPrice: '', notes: '', isActive: true },
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    const body = {
      activityId: Number(form.activityId),
      name: form.name,
      capacity: Number(form.capacity),
      slotMinutes: Number(form.slotMinutes),
      price: Number(form.price),
      peakPrice: form.peakPrice === '' ? null : Number(form.peakPrice),
      notes: form.notes || null,
      isActive: form.isActive,
    };
    try {
      if (resource) await patch(`/console/resources/${resource.id}`, body);
      else await post(`/console/venues/${venueId}/resources`, body);
      toast.ok(resource ? 'Saved' : `${form.name} added`);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={resource ? `Edit ${resource.name}` : 'Add a table or court'}
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
        <div className="form-grid">
          <Field label="Game" as="select" {...bind('activityId')}>
            {activities?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Field>
          <Field label="Name" placeholder="Pool Table 4" {...bind('name')} />
        </div>
        <div className="form-grid">
          <Field label="Max players" type="number" min={1} {...bind('capacity')} />
          <Field label="Slot length" as="select" {...bind('slotMinutes')} hint="Locked while upcoming bookings exist.">
            {SLOT_LENGTHS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Price per slot (₹)" type="number" min={0} {...bind('price')} />
          <Field label="Peak price (₹)" type="number" min={0} hint="After 6pm and weekends. Blank = same price." {...bind('peakPrice')} />
        </div>
        <Field label="Notes" placeholder="Cue rack needs a new tip" {...bind('notes')} />
        <label className="check">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Bookable
        </label>
      </div>
    </Modal>
  );
}

function BlockForm({ venue, onClose, onSaved }) {
  const toast = useToast();
  const { form, error, setError, bind } = useForm({
    resourceId: venue.resources.find((r) => r.isActive)?.id,
    date: isoDate(),
    start: venue.opensAt,
    end: venue.opensAt.replace(/^(\d\d)/, (h) => String(Math.min(23, Number(h) + 2)).padStart(2, '0')),
    reason: '',
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await post('/console/blocks', { ...form, resourceId: Number(form.resourceId) });
      toast.ok('Blocked off');
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Block off time"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={save} disabled={busy}>
            Block it
          </button>
        </>
      }
    >
      <div className="stack">
        <p className="muted">For maintenance, private events or tournaments. Players will see these slots as closed.</p>
        {error && !error.fields && <div className="notice notice--bad">{error.message}</div>}
        <Field label="Table or court" as="select" {...bind('resourceId')}>
          {venue.resources
            .filter((r) => r.isActive)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </Field>
        <div className="form-grid">
          <Field label="Date" type="date" min={isoDate()} {...bind('date')} />
          <Field label="From" type="time" {...bind('start')} />
          <Field label="To" type="time" {...bind('end')} />
        </div>
        <Field label="Reason" placeholder="Cloth change" {...bind('reason')} />
      </div>
    </Modal>
  );
}

export default function Venues() {
  usePageTitle('Venues');
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = atLeast(user, 'admin');
  const venues = useApi('/console/venues');
  const { data: activities } = useApi('/activities');
  const managers = useApi(isAdmin ? '/console/users' : null, { role: 'manager' });
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);

  const venue = venues.data?.find((v) => v.id === selected) ?? venues.data?.[0];
  const blocks = useApi(venue ? `/console/venues/${venue.id}/blocks` : null);

  useEffect(() => {
    if (!selected && venues.data?.length) setSelected(venues.data[0].id);
  }, [venues.data, selected]);

  const done = () => {
    setModal(null);
    venues.reload();
    blocks.reload();
  };

  const retire = async (r) => {
    if (!window.confirm(`Remove ${r.name}? Tables with booking history are hidden rather than deleted.`)) return;
    try {
      const res = await del(`/console/resources/${r.id}`);
      toast.ok(res.retired ? `${r.name} is no longer bookable` : `${r.name} removed`);
      venues.reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const unblock = async (b) => {
    try {
      await del(`/console/blocks/${b.id}`);
      toast.ok('Block removed');
      blocks.reload();
    } catch (err) {
      toast.error(err);
    }
  };

  if (venues.loading && !venues.data) return <PageLoader />;
  if (venues.error) return <ErrorNote error={venues.error} onRetry={venues.reload} />;

  return (
    <>
      <div className="c-head">
        <div>
          <h1>Venues &amp; tables</h1>
          <p>{isAdmin ? 'Every hall on the platform.' : 'The halls you manage.'}</p>
        </div>
        {isAdmin && (
          <button className="btn btn--primary btn--sm" onClick={() => setModal({ type: 'venue' })}>
            <Plus /> New venue
          </button>
        )}
      </div>

      {!venues.data.length ? (
        <div className="card">
          <EmptyState title="No venues assigned">Ask an admin to make you the manager of a venue.</EmptyState>
        </div>
      ) : (
        <>
          <div className="chip-scroll" style={{ marginBottom: 18 }}>
            {venues.data.map((v) => (
              <button key={v.id} className="chip" aria-pressed={venue.id === v.id} onClick={() => setSelected(v.id)}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: v.accent }} />
                {v.name}
                {!v.isActive && <span className="faint">(paused)</span>}
              </button>
            ))}
          </div>

          <div className="c-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.8fr)' }}>
            <section className="card" style={{ overflow: 'hidden', alignSelf: 'start' }}>
              <VenueArt venue={{ ...venue, activities: [...new Map(venue.resources.map((r) => [r.activity.id, { ...r.activity, slug: String(r.activity.id) }])).values()] }} className="" />
              <div className="card__body stack" style={{ '--gap': '10px' }}>
                <div className="spread">
                  <h2 style={{ fontSize: 24 }}>{venue.name}</h2>
                  <span className={`pill ${venue.isActive ? 'pill--ok' : 'pill--bad'}`}>{venue.isActive ? 'Live' : 'Paused'}</span>
                </div>
                <p className="muted">{venue.tagline}</p>
                <dl className="facts" style={{ marginTop: 8 }}>
                  <div>
                    <dt>Hours</dt>
                    <dd>
                      {clock(venue.opensAt)} – {clock(venue.closesAt)}
                    </dd>
                  </div>
                  <div>
                    <dt>City</dt>
                    <dd>{venue.city}</dd>
                  </div>
                  <div>
                    <dt>Manager</dt>
                    <dd>{venue.manager?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Desk staff</dt>
                    <dd>{venue.staff.map((s) => s.name).join(', ') || '—'}</dd>
                  </div>
                </dl>
                <div className="row" style={{ marginTop: 8, '--gap': '8px' }}>
                  <button className="btn btn--sm" onClick={() => setModal({ type: 'venue', venue })}>
                    <Pencil /> Edit details
                  </button>
                  <Link className="btn btn--sm btn--ghost" to={`/venues/${venue.slug}`} target="_blank">
                    <ExternalLink /> Public page
                  </Link>
                </div>
              </div>
            </section>

            <div className="stack" style={{ '--gap': '20px' }}>
              <section className="card">
                <div className="card__head">
                  <h2>Tables, courts &amp; lanes</h2>
                  <button className="btn btn--sm btn--primary" onClick={() => setModal({ type: 'resource' })}>
                    <Plus /> Add
                  </button>
                </div>
                <div className="table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Players</th>
                        <th>Slot</th>
                        <th className="num">Price</th>
                        <th className="num">Peak</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {venue.resources.map((r) => (
                        <tr key={r.id} style={{ opacity: r.isActive ? 1 : 0.5 }}>
                          <td>
                            <span className="row" style={{ '--gap': '10px', flexWrap: 'nowrap' }}>
                              <Glyph activity={r.activity} size="sm" />
                              <span>
                                <strong>{r.name}</strong>
                                <span className="faint" style={{ display: 'block', fontSize: 12.5 }}>
                                  {r.isActive ? r.activity.name : 'Not bookable'}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td>{r.capacity}</td>
                          <td className="mono">{r.slotMinutes}m</td>
                          <td className="num mono">{money(r.price)}</td>
                          <td className="num mono">{r.peakPrice != null ? money(r.peakPrice) : '—'}</td>
                          <td className="num" style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn btn--quiet btn--sm" onClick={() => setModal({ type: 'resource', resource: r })} aria-label={`Edit ${r.name}`}>
                              <Pencil />
                            </button>
                            {r.isActive && (
                              <button className="btn btn--quiet btn--sm" onClick={() => retire(r)} aria-label={`Remove ${r.name}`}>
                                <Trash2 />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <div className="card__head">
                  <h2>Blocked time</h2>
                  <button className="btn btn--sm" onClick={() => setModal({ type: 'block' })} disabled={!venue.resources.some((r) => r.isActive)}>
                    <CalendarOff /> Block off
                  </button>
                </div>
                {blocks.data?.length ? (
                  <div className="next-list">
                    {blocks.data.map((b) => (
                      <div key={b.id} className="next-item">
                        <span className="pill pill--warn pill--plain">{dayLabel(b.date)}</span>
                        <span>
                          <strong>{b.resource}</strong>
                          <span className="faint" style={{ display: 'block', fontSize: 13 }}>
                            {b.reason}
                          </span>
                        </span>
                        <span className="row" style={{ '--gap': '8px' }}>
                          <span className="mono">
                            {b.start}–{b.end}
                          </span>
                          <button className="btn btn--quiet btn--sm" onClick={() => unblock(b)} aria-label="Remove block">
                            <Trash2 />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="faint" style={{ padding: 20 }}>
                    Nothing blocked from today on.
                  </p>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {modal?.type === 'venue' && (
        <VenueForm venue={modal.venue} isAdmin={isAdmin} managers={managers.data?.filter((m) => m.isActive)} onClose={() => setModal(null)} onSaved={done} />
      )}
      {modal?.type === 'resource' && (
        <ResourceForm venueId={venue.id} resource={modal.resource} activities={activities} onClose={() => setModal(null)} onSaved={done} />
      )}
      {modal?.type === 'block' && <BlockForm venue={venue} onClose={() => setModal(null)} onSaved={done} />}
    </>
  );
}
