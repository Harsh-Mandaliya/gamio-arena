import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { del, patch, post } from '../../api/client.js';
import { ActivityIcon, Glyph, ICON_KEYS } from '../../components/ActivityIcon.jsx';
import Field from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { money } from '../../lib/format.js';

const COLORS = ['#1f7a5a', '#b23a2e', '#e2572b', '#2f6fde', '#7a4bd1', '#11a3b5', '#c98a2b', '#3d3d3d', '#d6336c', '#8a9a1b', '#2e8b3d', '#5146e0'];

function GameForm({ game, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(game ? { name: game.name, icon: game.icon, color: game.color, blurb: game.blurb ?? '' } : { name: '', icon: ICON_KEYS[0], color: COLORS[0], blurb: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (game) await patch(`/console/activities/${game.id}`, form);
      else await post('/console/activities', form);
      toast.ok(`${form.name} saved`);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={game ? `Edit ${game.name}` : 'New game type'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={save} disabled={busy}>
            Save
          </button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="notice notice--bad">{error.message}</div>}
        <div className="row" style={{ '--gap': '16px', alignItems: 'flex-start' }}>
          <Glyph activity={form} size="lg" />
          <div className="stack" style={{ flex: 1, '--gap': '12px' }}>
            <Field label="Name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={error?.fields?.name} />
          </div>
        </div>
        <Field label="Short description" as="textarea" rows={2} name="blurb" value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} />
        <div className="field">
          <span className="field__label">Icon</span>
          <div className="icon-picker">
            {ICON_KEYS.map((k) => (
              <button key={k} type="button" aria-pressed={form.icon === k} onClick={() => setForm({ ...form, icon: k })} aria-label={k}>
                <ActivityIcon name={k} />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label">Colour</span>
          <div className="row" style={{ '--gap': '8px' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={form.color === c}
                onClick={() => setForm({ ...form, color: c })}
                style={{ width: 32, height: 32, borderRadius: 9, background: c, border: form.color === c ? '3px solid var(--ink)' : '1.5px solid var(--line)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function GameTypes() {
  usePageTitle('Game types');
  const toast = useToast();
  const { data, loading, reload } = useApi('/activities');
  const [modal, setModal] = useState(null);

  const remove = async (a) => {
    if (!window.confirm(`Delete ${a.name}?`)) return;
    try {
      await del(`/console/activities/${a.id}`);
      toast.ok(`${a.name} deleted`);
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <>
      <div className="c-head">
        <div>
          <h1>Game types</h1>
          <p>The games players can filter by. Each table or court belongs to one.</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setModal({})}>
          <Plus /> New game type
        </button>
      </div>
      {loading && !data ? (
        <PageLoader />
      ) : (
        <div className="tiles">
          {data.map((a) => (
            <div key={a.id} className="card card__body row" style={{ '--gap': '14px', alignItems: 'flex-start' }}>
              <Glyph activity={a} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 19 }}>{a.name}</h3>
                <p className="faint" style={{ fontSize: 13.5, marginTop: 4 }}>
                  {a.resourceCount} tables · {a.venueCount} venues{a.fromPrice != null && ` · from ${money(a.fromPrice)}`}
                </p>
              </div>
              <div className="row" style={{ '--gap': '2px' }}>
                <button className="btn btn--quiet btn--sm" onClick={() => setModal({ game: a })} aria-label={`Edit ${a.name}`}>
                  <Pencil />
                </button>
                <button className="btn btn--quiet btn--sm" onClick={() => remove(a)} disabled={a.resourceCount > 0} title={a.resourceCount ? 'In use' : 'Delete'} aria-label={`Delete ${a.name}`}>
                  <Trash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <GameForm
          game={modal.game}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}
    </>
  );
}
