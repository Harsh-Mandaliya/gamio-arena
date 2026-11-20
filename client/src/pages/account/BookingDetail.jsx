import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CalendarX2, PartyPopper, Printer } from 'lucide-react';
import { post } from '../../api/client.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import Field from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PageLoader, { ErrorNote } from '../../components/PageLoader.jsx';
import Ticket from '../../components/Ticket.jsx';
import { useToast } from '../../components/Toasts.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { money } from '../../lib/format.js';

export default function BookingDetail() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const toast = useToast();
  const { data: b, error, loading, reload, setData } = useApi(`/me/bookings/${code}`);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  usePageTitle(code);

  if (loading && !b) return <PageLoader />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const cancel = async () => {
    setBusy(true);
    try {
      const updated = await post(`/me/bookings/${b.code}/cancel`, { reason: reason || undefined });
      setData(updated);
      await refresh();
      setConfirming(false);
      toast.ok(updated.paymentStatus === 'refunded' ? `Cancelled. ${money(updated.amount)} is back in your wallet.` : 'Booking cancelled.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const justBooked = params.get('new') && b.status === 'confirmed';

  return (
    <div className="stack" style={{ '--gap': '24px' }}>
      <div className="spread no-print">
        <Link to="/me/bookings" className="btn btn--quiet">
          <ArrowLeft /> All bookings
        </Link>
        <div className="row" style={{ '--gap': '8px' }}>
          <button className="btn btn--sm" onClick={() => window.print()}>
            <Printer /> Print
          </button>
          {b.cancel.ok && (
            <button className="btn btn--sm btn--danger" onClick={() => setConfirming(true)}>
              <CalendarX2 /> Cancel booking
            </button>
          )}
        </div>
      </div>

      {justBooked && (
        <div className="notice notice--ok no-print">
          <PartyPopper />
          <span>
            <strong>You&apos;re booked in.</strong> Show the code <span className="mono">{b.code}</span> at the desk when you arrive.
            {b.paymentStatus === 'unpaid' && ` Bring ${money(b.amount)} for the counter.`}
          </span>
        </div>
      )}

      <Ticket booking={b} />

      {!b.cancel.ok && b.status === 'confirmed' && (
        <p className="faint no-print" style={{ textAlign: 'center', fontSize: 14 }}>
          {b.cancel.reason}
        </p>
      )}
      {b.status === 'cancelled' && b.cancelReason && (
        <p className="faint" style={{ textAlign: 'center', fontSize: 14 }}>
          {/^cancelled/i.test(b.cancelReason) ? b.cancelReason : `Cancelled: ${b.cancelReason}`}
        </p>
      )}

      {confirming && (
        <Modal
          title="Cancel this booking?"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirming(false)}>
                Keep it
              </button>
              <button className="btn btn--danger" onClick={cancel} disabled={busy}>
                {busy ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </>
          }
        >
          <div className="stack">
            <p>
              {b.resource.name} at {b.venue.name}, {b.start}–{b.end}.{' '}
              {b.paymentStatus === 'paid' ? `${money(b.amount)} goes straight back to your wallet.` : 'Nothing was charged yet.'}
            </p>
            <Field label="Reason (optional)" name="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Plans changed" />
          </div>
        </Modal>
      )}
    </div>
  );
}
