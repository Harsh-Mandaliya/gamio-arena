import { useEffect, useMemo, useState } from 'react';
import { get, post } from '../../api/client.js';
import Field from '../Field.jsx';
import Modal from '../Modal.jsx';
import { useToast } from '../Toasts.jsx';
import { dayLabel, money } from '../../lib/format.js';
import PlayerSearch from './PlayerSearch.jsx';

/** Book a table from the desk, for a registered player or a walk-in guest. */
export default function WalkInModal({ resource, date, start, onClose, onBooked }) {
  const toast = useToast();
  const [slots, setSlots] = useState(null);
  const [form, setForm] = useState({ start, slotCount: 1, players: Math.min(2, resource.capacity), guestName: '', guestPhone: '', note: '' });
  const [who, setWho] = useState('guest');
  const [player, setPlayer] = useState(null);
  const [payment, setPayment] = useState('venue');
  const [markPaid, setMarkPaid] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get(`/resources/${resource.id}/slots`, { date }).then((d) => setSlots(d.slots));
  }, [resource.id, date]);

  const open = useMemo(() => slots?.filter((s) => s.state === 'open') ?? [], [slots]);

  useEffect(() => {
    if (slots && !open.some((s) => s.start === form.start)) setForm((f) => ({ ...f, start: open[0]?.start ?? '' }));
  }, [slots, open, form.start]);

  const chosen = useMemo(() => {
    if (!slots) return [];
    const i = slots.findIndex((s) => s.start === form.start);
    const run = [];
    for (let k = i; k >= 0 && k < slots.length && run.length < form.slotCount && slots[k].state === 'open'; k++) run.push(slots[k]);
    return run;
  }, [slots, form.start, form.slotCount]);

  const total = chosen.reduce((s, x) => s + x.price, 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        resourceId: resource.id,
        date,
        start: form.start,
        slotCount: Number(form.slotCount),
        players: Number(form.players),
        note: form.note || undefined,
        paymentMethod: who === 'player' ? payment : 'venue',
        markPaid: payment === 'venue' && markPaid,
        ...(who === 'player' ? { customerId: player?.id } : { guestName: form.guestName, guestPhone: form.guestPhone || undefined }),
      };
      const booking = await post('/console/bookings', body);
      toast.ok(`Booked ${booking.code} for ${booking.customer.name}`);
      onBooked(booking);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`New booking · ${resource.name}`}
      onClose={onClose}
      footer={
        <>
          <span className="faint" style={{ marginRight: 'auto', alignSelf: 'center' }}>
            Total <strong className="mono" style={{ color: 'var(--ink)', fontSize: 18 }}>{money(total)}</strong>
          </span>
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn btn--primary" form="walkin" disabled={busy || !chosen.length || (who === 'player' && !player)}>
            {busy ? 'Booking…' : 'Book it'}
          </button>
        </>
      }
    >
      <form id="walkin" className="stack" onSubmit={submit} noValidate>
        {error && <div className="notice notice--bad">{error.message}</div>}
        <div className="form-grid">
          <Field label={`Start (${dayLabel(date)})`} as="select" name="start" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}>
            {open.length === 0 && <option value="">No free slots</option>}
            {open.map((s) => (
              <option key={s.start} value={s.start}>
                {s.start} · {money(s.price)}
              </option>
            ))}
          </Field>
          <Field label="Slots" as="select" name="slotCount" value={form.slotCount} onChange={(e) => setForm({ ...form, slotCount: Number(e.target.value) })} hint={chosen.length ? `${chosen[0].start}–${chosen.at(-1).end}` : ''}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} × {resource.slotMinutes} min
              </option>
            ))}
          </Field>
          <Field label="Players" type="number" name="players" min={1} max={resource.capacity} value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })} hint={`Max ${resource.capacity}`} />
        </div>
        {chosen.length < form.slotCount && chosen.length > 0 && (
          <div className="notice notice--warn">Only {chosen.length} free slot(s) in a row from {form.start}.</div>
        )}

        <div className="seg" role="group" aria-label="Who is playing">
          <button type="button" aria-pressed={who === 'guest'} onClick={() => setWho('guest')}>
            Walk-in guest
          </button>
          <button type="button" aria-pressed={who === 'player'} onClick={() => setWho('player')}>
            Registered player
          </button>
        </div>

        {who === 'guest' ? (
          <div className="form-grid">
            <Field label="Guest name" name="guestName" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} error={error?.fields?.guestName} />
            <Field label="Phone" name="guestPhone" type="tel" value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} />
          </div>
        ) : (
          <>
            <PlayerSearch selected={player} onPick={setPlayer} />
            {player && (
              <div className="seg" role="group" aria-label="Payment">
                <button type="button" aria-pressed={payment === 'venue'} onClick={() => setPayment('venue')}>
                  Counter
                </button>
                <button type="button" aria-pressed={payment === 'wallet'} onClick={() => setPayment('wallet')} disabled={player.wallet < total}>
                  Wallet ({money(player.wallet)})
                </button>
              </div>
            )}
          </>
        )}

        {payment === 'venue' || who === 'guest' ? (
          <label className="check">
            <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} /> Payment taken now (cash / UPI)
          </label>
        ) : null}

        <Field label="Note for the floor" name="note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Birthday group, needs extra cues" />
      </form>
    </Modal>
  );
}
