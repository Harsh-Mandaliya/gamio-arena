import { useEffect } from 'react';
import { useApi } from '../../hooks/useApi.js';

/** Venue dropdown limited to what the signed-in user can manage. */
export default function VenueSelect({ value, onChange, allowAll = false, className = 'select select--sm' }) {
  const { data } = useApi('/console/my-venues');

  useEffect(() => {
    if (!allowAll && data?.length && !value) onChange(data[0].id);
  }, [data, value, allowAll, onChange]);

  if (!data) return <span className="skeleton" style={{ width: 180, height: 36 }} />;
  if (data.length === 1 && !allowAll) return <span className="chip">{data[0].name}</span>;

  return (
    <select className={className} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} aria-label="Venue" style={{ width: 'auto' }}>
      {allowAll && <option value="">All my venues</option>}
      {data.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  );
}
