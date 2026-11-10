import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiLogin, apiRegister, apiGetMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('xai_hedl_token'));
  const [loading, setLoading] = useState(true);

  // Hydrate user from stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('xai_hedl_token');
    const storedUser = localStorage.getItem('xai_hedl_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setLoading(false);
      // Optionally verify token is still valid
      apiGetMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('xai_hedl_user', JSON.stringify(res.data));
        })
        .catch(() => {
          // Token expired / invalid — clear silently
          // (401 interceptor will handle redirect)
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiLogin({ email, password });
    const authToken = res.data.token || res.data.access_token;
    const userData = res.data.user;
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('xai_hedl_token', authToken);
    localStorage.setItem('xai_hedl_user', JSON.stringify(userData));
    return userData;
  }, []);

  const register = useCallback(async (data) => {
    const res = await apiRegister(data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('xai_hedl_token');
    localStorage.removeItem('xai_hedl_user');
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;

