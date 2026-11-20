import { Inbox as InboxIcon, Mail } from 'lucide-react';
import { patch } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { useToast } from '../../components/Toasts.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { relative } from '../../lib/format.js';

const TOPIC = { general: 'General', booking: 'Booking', events: 'Event', partnership: 'Partnership' };

export default function Inbox() {
  usePageTitle('Inbox');
  const toast = useToast();
  const { data, loading, setData } = useApi('/console/enquiries');

  const setStatus = async (e, status) => {
    try {
      await patch(`/console/enquiries/${e.id}`, { status });
      setData((list) => list.map((x) => (x.id === e.id ? { ...x, status } : x)));
    } catch (err) {
      toast.error(err);
    }
  };

  if (loading && !data) return <PageLoader />;

  return (
    <>
      <div className="c-head">
        <div>
          <h1>Inbox</h1>
          <p>Messages from the contact form. Reply by email, then mark them done.</p>
        </div>
      </div>
      <section className="card">
        {data.length === 0 ? (
          <EmptyState icon={<InboxIcon />} title="Inbox zero">
            Nothing waiting.
          </EmptyState>
        ) : (
          data.map((e) => (
            <article key={e.id} className="enquiry" style={{ opacity: e.status === 'closed' ? 0.6 : 1 }}>
              <div className="spread">
                <div className="row" style={{ '--gap': '10px' }}>
                  <strong>{e.name}</strong>
                  <span className="pill pill--plain">{TOPIC[e.topic]}</span>
                  <StatusPill kind="enquiry" value={e.status} />
                </div>
                <span className="faint mono" style={{ fontSize: 12.5 }}>
                  {relative(e.createdAt)}
                </span>
              </div>
              <p>{e.message}</p>
              <div className="row" style={{ marginTop: 12, '--gap': '8px' }}>
                <a className="btn btn--sm" href={`mailto:${e.email}?subject=${encodeURIComponent('Re: your message to Gamio Arena')}`}>
                  <Mail /> {e.email}
                </a>
                {e.status !== 'in_progress' && e.status !== 'closed' && (
                  <button className="btn btn--sm btn--ghost" onClick={() => setStatus(e, 'in_progress')}>
                    Working on it
                  </button>
                )}
                {e.status !== 'closed' ? (
                  <button className="btn btn--sm btn--ghost" onClick={() => setStatus(e, 'closed')}>
                    Mark done
                  </button>
                ) : (
                  <button className="btn btn--sm btn--quiet" onClick={() => setStatus(e, 'new')}>
                    Reopen
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
