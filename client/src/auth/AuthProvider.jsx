import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, setUnauthorizedHandler, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!tokenStore.get());
  // True after the person signs out on purpose, so guarded pages send them
  // home instead of to the sign-in screen with a "come back here" note.
  const [signedOut, setSignedOut] = useState(false);

  const signOut = useCallback((deliberate = true) => {
    tokenStore.set(null);
    setUser(null);
    setSignedOut(deliberate);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return null;
    try {
      const me = await get('/auth/me');
      setUser(me);
      return me;
    } catch {
      signOut(false);
      return null;
    } finally {
      setReady(true);
    }
  }, [signOut]);

  useEffect(() => {
    setUnauthorizedHandler(() => signOut(false));
    refresh();
  }, [refresh, signOut]);

  const signIn = useCallback(async (email, password) => {
    const { token } = await post('/auth/login', { email, password });
    tokenStore.set(token);
    setSignedOut(false);
    return refresh();
  }, [refresh]);

  const register = useCallback(async (details) => {
    const { token } = await post('/auth/register', details);
    tokenStore.set(token);
    setSignedOut(false);
    return refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, ready, signedOut, signIn, register, signOut, refresh, setUser }),
    [user, ready, signedOut, signIn, register, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
