import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getSession, saveSession } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession);

  const login = useCallback((s) => {
    saveSession(s);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  useEffect(() => {
    window.addEventListener('avya:logout', logout);
    return () => window.removeEventListener('avya:logout', logout);
  }, [logout]);

  const value = useMemo(() => ({ session, user: session?.user || null, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
