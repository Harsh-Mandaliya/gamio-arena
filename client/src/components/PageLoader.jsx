export default function PageLoader({ label = 'Loading' }) {
  return (
    <div className="page-loader" role="status">
      <div className="spinner" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="notice notice--bad" role="alert">
      <span style={{ flex: 1 }}>{error.message}</span>
      {onRetry && (
        <button className="btn btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
