import PageLoader from '../../components/PageLoader.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { stamp } from '../../lib/format.js';
import { ROLE_LABEL } from '../../lib/roles.js';

const VERB = {
  'booking.create': 'made booking',
  'booking.cancel': 'cancelled booking',
  'booking.checked_in': 'checked in',
  'booking.completed': 'finished',
  'booking.no_show': 'marked no-show on',
  'booking.paid': 'took payment for',
  'wallet.topup': 'topped up a wallet',
  'wallet.adjust': 'corrected a wallet',
  'venue.create': 'created a venue',
  'venue.update': 'edited a venue',
  'resource.create': 'added a table',
  'resource.update': 'edited a table',
  'resource.retire': 'retired a table',
  'resource.delete': 'deleted a table',
  'block.create': 'blocked off time',
  'block.delete': 'removed a block',
  'user.register': 'signed up',
  'user.create': 'added a person',
  'user.update': 'changed a person',
  'user.password': 'changed their password',
  'activity.create': 'added a game type',
  'activity.update': 'edited a game type',
  'activity.delete': 'deleted a game type',
};

function describe(row) {
  let detail = {};
  try {
    detail = JSON.parse(row.detail ?? '{}') ?? {};
  } catch {
    // older plain-text detail
  }
  if (detail.code) return detail.code;
  if (detail.amount) return `₹${detail.amount}`;
  if (detail.name) return detail.name;
  if (detail.reason) return detail.reason;
  return '';
}

export default function ActivityLog() {
  usePageTitle('Activity log');
  const { data, loading } = useApi('/console/audit');

  if (loading && !data) return <PageLoader />;

  return (
    <>
      <div className="c-head">
        <div>
          <h1>Activity log</h1>
          <p>The last 200 changes anyone made. Useful when the numbers don&apos;t add up.</p>
        </div>
      </div>
      <section className="card">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td className="mono faint" style={{ whiteSpace: 'nowrap' }}>
                    {stamp(r.createdAt)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.actor ?? 'System'}
                    {r.actorRole && <span className="faint"> · {ROLE_LABEL[r.actorRole]}</span>}
                  </td>
                  <td>
                    {VERB[r.action] ?? r.action} <span className="mono">{describe(r)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
