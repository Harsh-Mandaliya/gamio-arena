import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../api/client.js';

/**
 * Loads `path` and reloads when `path` or `query` change.
 * Pass null as path to skip loading.
 */
export function useApi(path, query) {
  const key = path ? `${path}?${JSON.stringify(query ?? {})}` : null;
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [tick, setTick] = useState(0);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    get(path, queryRef.current, { signal: ctrl.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((s) => ({ ...s, error, loading: false }));
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })), []);

  return { ...state, reload, setData };
}
