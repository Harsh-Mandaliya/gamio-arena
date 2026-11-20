import { isoDate, money, parseDate } from '../../lib/format.js';

/** Daily bars for the last N days. Tallest bar sets the scale. */
export function DailyBars({ days, metric = 'bookings' }) {
  const max = Math.max(1, ...days.map((d) => d[metric]));
  const today = isoDate();
  return (
    <>
      <div className="bars" style={{ '--n': days.length }}>
        {days.map((d, i) => {
          const date = parseDate(d.date);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <div
              key={d.date}
              className={`bars__col ${d.date === today ? 'is-today' : ''} ${weekend ? 'is-weekend' : ''}`}
              tabIndex={0}
              aria-label={`${d.date}: ${d.bookings} bookings, ${money(d.revenue)}`}
            >
              <span className="bars__tip">
                {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {metric === 'revenue' ? money(d.revenue) : `${d.bookings} games`}
              </span>
              <div className="bars__bar" style={{ height: `${(d[metric] / max) * 100}%`, animationDelay: `${i * 25}ms` }} />
            </div>
          );
        })}
      </div>
      <div className="bars__axis" style={{ '--n': days.length }}>
        {days.map((d, i) => (
          <span key={d.date}>{i % 2 === 0 || days.length < 10 ? parseDate(d.date).getDate() : ''}</span>
        ))}
      </div>
    </>
  );
}

export function ShareBars({ rows, value = 'bookings', label, format = (n) => n }) {
  const max = Math.max(1, ...rows.map((r) => r[value]));
  return (
    <div className="shares">
      {rows.map((r) => (
        <div key={r.name + (r.venue ?? '')} className="share">
          <span className="share__name" style={{ gridColumn: '1 / 3' }}>
            {label(r)}
          </span>
          <span className="mono faint" style={{ fontSize: 13, gridColumn: 3, gridRow: 1 }}>
            {format(r[value])}
          </span>
          <div className="share__track" style={{ gridColumn: '1 / -1' }}>
            <span style={{ width: `${(r[value] / max) * 100}%`, '--share-color': r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
