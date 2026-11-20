import { useState } from 'react';
import { WalletCards } from 'lucide-react';
import { post } from '../../api/client.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Field from '../../components/Field.jsx';
import Ledger from '../../components/Ledger.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import PlayerSearch from '../../components/console/PlayerSearch.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { initials, money } from '../../lib/format.js';
import { atLeast } from '../../lib/roles.js';

const QUICK = [200, 500, 1000, 2000];

export default function Wallets() {
  usePageTitle('Wallets');
  const { user } = useAuth();
  const toast = useToast();
  const [player, setPlayer] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('topup');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const wallet = useApi(player ? `/console/players/${player.id}/wallet` : null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const value = Number(amount);
      const res =
        mode === 'topup'
          ? await post('/console/wallet/topup', { userId: player.id, amount: value, note: note || undefined })
          : await post('/console/wallet/adjust', { userId: player.id, amount: value, note });
      toast.ok(`${player.name.split(' ')[0]}'s wallet is now ${money(res.balance)}`);
      setAmount('');
      setNote('');
      wallet.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="c-head">
        <div>
          <h1>Wallets</h1>
          <p>Load cash or UPI onto a player&apos;s wallet at the counter.</p>
        </div>
      </div>

      <div className="c-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)' }}>
        <section className="card">
          <div className="card__head">
            <h2>Find the player</h2>
          </div>
          <div className="card__body">
            <PlayerSearch selected={player} onPick={setPlayer} autoFocus />
          </div>
        </section>

        <section className="card">
          {!player ? (
            <EmptyState icon={<WalletCards />} title="No player selected">
              Search by name, email or phone to see their balance and history.
            </EmptyState>
          ) : (
            <>
              <div className="card__head">
                <div className="row" style={{ '--gap': '12px' }}>
                  <span className="avatar">{initials(player.name)}</span>
                  <div>
                    <h2>{player.name}</h2>
                    <span className="faint" style={{ fontSize: 13 }}>
                      {player.email}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="eyebrow">Balance</span>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>{money(wallet.data?.balance ?? player.wallet)}</div>
                </div>
              </div>
              <form className="card__body stack" onSubmit={submit} noValidate>
                {atLeast(user, 'manager') && (
                  <div className="seg" role="group" aria-label="Type">
                    <button type="button" aria-pressed={mode === 'topup'} onClick={() => setMode('topup')}>
                      Top-up
                    </button>
                    <button type="button" aria-pressed={mode === 'adjust'} onClick={() => setMode('adjust')}>
                      Correction
                    </button>
                  </div>
                )}
                {error && !error.fields && <div className="notice notice--bad">{error.message}</div>}
                {mode === 'topup' && (
                  <div className="row" style={{ '--gap': '8px' }}>
                    {QUICK.map((q) => (
                      <button key={q} type="button" className="chip" aria-pressed={Number(amount) === q} onClick={() => setAmount(String(q))}>
                        +{money(q)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="form-grid">
                  <Field
                    label={mode === 'topup' ? 'Amount received (₹)' : 'Amount (₹, negative to deduct)'}
                    name="amount"
                    type="number"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    error={error?.fields?.amount}
                  />
                  <Field
                    label={mode === 'topup' ? 'Note (optional)' : 'Reason'}
                    name="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={mode === 'topup' ? 'UPI ref, cash…' : 'Double charge on GA-…'}
                    error={error?.fields?.note}
                  />
                </div>
                <div>
                  <button className="btn btn--primary" disabled={busy || !amount}>
                    {busy ? 'Saving…' : mode === 'topup' ? `Add ${amount ? money(Number(amount)) : ''}` : 'Apply correction'}
                  </button>
                </div>
              </form>
              {wallet.loading && !wallet.data ? <PageLoader /> : <Ledger transactions={wallet.data?.transactions ?? []} />}
            </>
          )}
        </section>
      </div>
    </>
  );
}
