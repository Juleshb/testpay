import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as clearAuth, getToken } from './auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    const me = await getMe();
    setUser(me);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginUser = (userData) => {
    setUser(userData);
  };

  const logoutUser = () => {
    clearAuth();
    setUser(null);
    import('./lib/messageNotifications.js').then((m) => m.clearAppBadge()).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
