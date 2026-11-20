import { useAuth } from '../../auth/AuthProvider.jsx';
import Ledger from '../../components/Ledger.jsx';
import { LogoMark } from '../../components/Logo.jsx';
import PageLoader, { ErrorNote } from '../../components/PageLoader.jsx';
import { useApi } from '../../hooks/useApi.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { money } from '../../lib/format.js';

export default function Wallet() {
  usePageTitle('Wallet');
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/me/wallet');

  if (loading && !data) return <PageLoader />;

  return (
    <div className="stack" style={{ '--gap': '28px' }}>
      <ErrorNote error={error} onRetry={reload} />
      <div className="row" style={{ alignItems: 'stretch', '--gap': '28px' }}>
        <div className="wallet-card" style={{ flex: '1 1 300px' }}>
          <div className="spread" style={{ position: 'relative' }}>
            <span className="eyebrow" style={{ color: 'rgb(255 255 255 / 0.7)' }}>
              Gamio wallet
            </span>
            <LogoMark size={30} />
          </div>
          <div>
            <div className="wallet-card__balance">{money(data?.balance ?? user.wallet)}</div>
            <div className="mono" style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
              {user.name.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="card card__body stack" style={{ flex: '1 1 300px', '--gap': '10px' }}>
          <h3 style={{ fontSize: 20 }}>Topping up</h3>
          <p className="muted">
            Hand cash or pay by UPI at any Gamio front desk and they&apos;ll load it onto your wallet straight away. Wallet
            bookings are paid on the spot, and cancellations come back here automatically.
          </p>
          <p className="faint" style={{ fontSize: 13.5 }}>Minimum ₹50, maximum ₹20,000 per top-up.</p>
        </div>
      </div>

      <section className="card">
        <div className="card__head">
          <h2>History</h2>
        </div>
        <Ledger transactions={data?.transactions ?? []} />
      </section>
    </div>
  );
}
