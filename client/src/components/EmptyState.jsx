export default function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty">
      {icon && <div className="empty__art">{icon}</div>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
