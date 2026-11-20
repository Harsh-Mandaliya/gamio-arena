import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (message, tone = 'ok') => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-3), { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      ok: (msg) => push(msg, 'ok'),
      error: (msgOrErr) => push(typeof msgOrErr === 'string' ? msgOrErr : msgOrErr?.message ?? 'Something went wrong', 'error'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.tone === 'error' ? <CircleAlert /> : <CircleCheck />}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button className="btn--quiet" style={{ border: 0, background: 'none', padding: 0 }} onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
