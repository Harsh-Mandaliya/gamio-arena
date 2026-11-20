import { useState } from 'react';
import { Ban, Banknote, CircleCheckBig, LogIn, UserX } from 'lucide-react';
import { patch, post } from '../../api/client.js';
import { Glyph } from '../ActivityIcon.jsx';
import Field from '../Field.jsx';
import Modal from '../Modal.jsx';
import StatusPill from '../StatusPill.jsx';
import { useToast } from '../Toasts.jsx';
import { dayLabel, duration, money, stamp } from '../../lib/format.js';

/** Everything the desk can do to one booking, in a modal. */
export default function BookingPanel({ booking, onClose, onChange }) {
  const toast = useToast();
  const [b, setB] = useState(booking);
  const [busy, setBusy] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  const act = async (key, fn, message) => {
    setBusy(key);
    try {
      const next = await fn();
      setB(next);
      onChange?.(next);
      toast.ok(message(next));
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy('');
    }
  };

  const setStatus = (status, label) =>
    act(status, () => patch(`/console/bookings/${b.id}`, { status }), () => `${b.code} ${label}`);
  const markPaid = () =>
    act('paid', () => patch(`/console/bookings/${b.id}`, { paymentStatus: 'paid' }), () => `${money(b.amount)} received for ${b.code}`);
  const cancel = () =>
    act(
      'cancel',
      () => post(`/console/bookings/${b.id}/cancel`, { reason: reason || undefined }),
      (n) => (n.paymentStatus === 'refunded' && !n.customer.guest ? `Cancelled, ${money(n.amount)} refunded to wallet` : 'Booking cancelled'),
    ).then(() => setCancelling(false));

  const live = b.status === 'confirmed' || b.status === 'checked_in';

  return (
    <Modal
      title={b.code}
      onClose={onClose}
      footer={
        cancelling ? (
          <div className="stack" style={{ width: '100%', '--gap': '10px' }}>
            <Field label="Reason for cancelling" name="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer called" />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setCancelling(false)}>
                Back
              </button>
              <button className="btn btn--danger" onClick={cancel} disabled={busy === 'cancel'}>
                Confirm cancel
              </button>
            </div>
          </div>
        ) : (
          live && (
            <>
              {b.cancel?.ok && (
                <button className="btn btn--danger btn--sm" onClick={() => setCancelling(true)} style={{ marginRight: 'auto' }}>
                  <Ban /> Cancel
                </button>
              )}
              {b.status === 'confirmed' && (
                <button className="btn btn--sm" onClick={() => setStatus('no_show', 'marked as no-show')} disabled={!!busy}>
                  <UserX /> No-show
                </button>
              )}
              {b.paymentStatus === 'unpaid' && (
                <button className="btn btn--sm btn--accent" onClick={markPaid} disabled={!!busy}>
                  <Banknote /> Mark {money(b.amount)} paid
                </button>
              )}
              {b.status === 'confirmed' ? (
                <button className="btn btn--sm btn--primary" onClick={() => setStatus('checked_in', 'checked in')} disabled={!!busy}>
                  <LogIn /> Check in
                </button>
              ) : (
                <button className="btn btn--sm btn--primary" onClick={() => setStatus('completed', 'marked as played')} disabled={!!busy}>
                  <CircleCheckBig /> Finish game
                </button>
              )}
            </>
          )
        )
      }
    >
      <div className="bp-head" style={{ '--tone': b.activity.color }}>
        <Glyph activity={b.activity} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 18 }}>{b.resource.name}</strong>
          <div className="faint" style={{ fontSize: 13.5 }}>
            {b.activity.name} · {b.venue.name}
          </div>
        </div>
        <div className="stack" style={{ '--gap': '6px', alignItems: 'flex-end' }}>
          <StatusPill value={b.status} />
          <StatusPill kind="payment" value={b.paymentStatus} />
        </div>
      </div>

      <dl className="facts">
        <div>
          <dt>When</dt>
          <dd>
            {dayLabel(b.date)}, <span className="mono">{b.start}–{b.end}</span>
          </dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{duration(b.start, b.end)}</dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>
            {b.customer.name} {b.customer.guest && <span className="pill pill--plain">walk-in</span>}
          </dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>{b.customer.phone || b.customer.email || '—'}</dd>
        </div>
        <div>
          <dt>Players</dt>
          <dd>
            {b.players} of {b.resource.capacity}
          </dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>
            {money(b.amount)} · {b.paymentMethod === 'wallet' ? 'wallet' : 'counter'}
          </dd>
        </div>
        <div>
          <dt>Booked</dt>
          <dd className="mono" style={{ fontWeight: 500 }}>
            {stamp(b.createdAt)}
          </dd>
        </div>
        {b.note && (
          <div>
            <dt>Note</dt>
            <dd>{b.note}</dd>
          </div>
        )}
        {b.cancelReason && (
          <div style={{ gridColumn: '1 / -1' }}>
            <dt>Cancelled because</dt>
            <dd>{b.cancelReason}</dd>
          </div>
        )}
      </dl>
    </Modal>
  );
}
