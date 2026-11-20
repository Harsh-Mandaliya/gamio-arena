import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { get } from '../../api/client.js';
import { initials, money } from '../../lib/format.js';

/** Type-ahead over registered players. Calls onPick with the chosen player. */
export default function PlayerSearch({ selected, onPick, autoFocus }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      get('/console/players', { q }, { signal: ctrl.signal })
        .then(setResults)
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="stack" style={{ '--gap': '8px' }}>
      <div className="input-icon">
        <Search />
        <input
          className="input"
          placeholder="Name, email or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          aria-label="Find a player"
        />
      </div>
      {results.length > 0 && (
        <div className="player-pick">
          {results.map((p) => (
            <button key={p.id} type="button" aria-pressed={selected?.id === p.id} onClick={() => onPick(p)}>
              <span className="avatar">{initials(p.name)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{p.name}</strong>
                <span className="faint" style={{ display: 'block', fontSize: 13 }}>
                  {p.email}
                  {p.phone ? ` · ${p.phone}` : ''}
                </span>
              </span>
              <span className="mono" style={{ fontSize: 13 }}>
                {money(p.wallet)}
              </span>
            </button>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && results.length === 0 && <span className="faint" style={{ fontSize: 13.5 }}>No players match “{q}”.</span>}
    </div>
  );
}
