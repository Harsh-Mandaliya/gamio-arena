import { useState } from 'react';
import { Download, ListX, Search } from 'lucide-react';
import { get } from '../../api/client.js';
import { Glyph } from '../../components/ActivityIcon.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageLoader, { ErrorNote } from '../../components/PageLoader.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { useToast } from '../../components/Toasts.jsx';
import BookingPanel from '../../components/console/BookingPanel.jsx';
import VenueSelect from '../../components/console/VenueSelect.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { addDays, isoDate, money, shortDate } from '../../lib/format.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../../lib/status.js';

const csvCell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;

export default function Bookings() {
  usePageTitle('Bookings');
  const toast = useToast();
  const [filters, setFilters] = useState({ venueId: null, from: addDays(isoDate(), -7), to: addDays(isoDate(), 7), status: '', payment: '', q: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [exporting, setExporting] = useState(false);
  const { data, error, loading, reload } = useApi('/console/bookings', { ...filters, page });

  const set = (key) => (value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = [];
      for (let p = 1; p <= 40; p++) {
        const res = await get('/console/bookings', { ...filters, page: p });
        rows.push(...res.items);
        if (p >= res.pages) break;
      }
      const header = ['Code', 'Date', 'Start', 'End', 'Venue', 'Table', 'Game', 'Customer', 'Phone', 'Players', 'Amount', 'Method', 'Payment', 'Status'];
      const lines = rows.map((b) =>
        [b.code, b.date, b.start, b.end, b.venue.name, b.resource.name, b.activity.name, b.customer.name, b.customer.phone, b.players, b.amount, b.paymentMethod, b.paymentStatus, b.status]
          .map(csvCell)
          .join(','),
      );
      const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `gamio-bookings-${filters.from}-to-${filters.to}.csv` });
      a.click();
      URL.revokeObjectURL(a.href);
      toast.ok(`Exported ${rows.length} bookings`);
    } catch (err) {
      toast.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="c-head">
        <div>
          <h1>Bookings</h1>
          <p>
            {data ? `${data.total} bookings · ${money(data.paidAmount)} collected` : 'Search, filter and export.'}
          </p>
        </div>
        <button className="btn btn--sm" onClick={exportCsv} disabled={exporting || !data?.total}>
          <Download /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <section className="card">
        <div className="card__head" style={{ flexWrap: 'wrap' }}>
          <div className="c-toolbar" style={{ flex: 1 }}>
            <div className="input-icon" style={{ flex: '1 1 220px' }}>
              <Search />
              <input className="input input--sm" placeholder="Code, name, email or phone" value={filters.q} onChange={(e) => set('q')(e.target.value)} aria-label="Search" />
            </div>
            <VenueSelect value={filters.venueId} onChange={set('venueId')} allowAll />
            <input type="date" className="input input--sm" style={{ width: 'auto' }} value={filters.from} onChange={(e) => set('from')(e.target.value)} aria-label="From" />
            <input type="date" className="input input--sm" style={{ width: 'auto' }} value={filters.to} onChange={(e) => set('to')(e.target.value)} aria-label="To" />
            <select className="select select--sm" style={{ width: 'auto' }} value={filters.status} onChange={(e) => set('status')(e.target.value)} aria-label="Status">
              <option value="">Any status</option>
              {Object.entries(BOOKING_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <select className="select select--sm" style={{ width: 'auto' }} value={filters.payment} onChange={(e) => set('payment')(e.target.value)} aria-label="Payment">
              <option value="">Any payment</option>
              {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {k === 'unpaid' ? 'Unpaid' : v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ErrorNote error={error} onRetry={reload} />
        {loading && !data ? (
          <PageLoader />
        ) : data?.items.length ? (
          <>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>When</th>
                    <th>Table</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody style={{ opacity: loading ? 0.5 : 1 }}>
                  {data.items.map((b) => (
                    <tr key={b.id} className="is-clickable" onClick={() => setOpen(b)}>
                      <td className="mono">{b.code}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {shortDate(b.date)} <span className="mono faint">{b.start}</span>
                      </td>
                      <td>
                        <span className="row" style={{ '--gap': '8px', flexWrap: 'nowrap' }}>
                          <Glyph activity={b.activity} size="sm" />
                          <span>
                            {b.resource.name}
                            <span className="faint" style={{ display: 'block', fontSize: 12.5 }}>
                              {b.venue.name}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td>
                        {b.customer.name}
                        {b.customer.guest && <span className="faint"> · walk-in</span>}
                      </td>
                      <td>
                        <StatusPill value={b.status} />
                      </td>
                      <td>
                        <StatusPill kind="payment" value={b.paymentStatus} />
                      </td>
                      <td className="num mono">{money(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span className="faint">
                Page {data.page} of {data.pages}
              </span>
              <div className="row" style={{ '--gap': '8px' }}>
                <button className="btn btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <button className="btn btn--sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState icon={<ListX />} title="No bookings match">
            Widen the date range or clear a filter.
          </EmptyState>
        )}
      </section>

      {open && <BookingPanel booking={open} onClose={() => setOpen(null)} onChange={reload} />}
    </>
  );
}
