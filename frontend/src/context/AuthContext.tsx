import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { authApi, type UserInfo } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  setSession: (user: UserInfo, token: string) => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const authOperation = useRef(0);
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  // Restore session from localStorage on mount
    useEffect(() => {
    const token = localStorage.getItem('hr_token');
    const userJson = localStorage.getItem('hr_user');

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as UserInfo;
        setState({ user, token, isLoading: false });
        
        // Fetch fresh user data in background to get updated permissions
        authApi.me().then(res => {
          if (localStorage.getItem('hr_token') === token && res.data.success && res.data.user) {
            localStorage.setItem('hr_user', JSON.stringify(res.data.user));
            setState(p => localStorage.getItem('hr_token') === token ? { ...p, token, user: res.data.user } : p);
          }
        }).catch(err => {
          if (localStorage.getItem('hr_token') === token) console.error('Background auth fetch failed', err);
        });
      } catch {
        localStorage.removeItem('hr_token');
        localStorage.removeItem('hr_user');
        setState({ user: null, token: null, isLoading: false });
      }
    } else {
      setState(p => ({ ...p, isLoading: false }));
    }
  }, []);

  // Permissions can be changed by an administrator while an employee tab is open.
  // Refresh the session whenever that tab becomes active again.
  useEffect(() => {
    const refreshUser = () => {
      const token = localStorage.getItem('hr_token');
      if (!token) {
        setState({ user: null, token: null, isLoading: false });
        return;
      }
      authApi.me().then(res => {
        if (localStorage.getItem('hr_token') === token && res.data.success && res.data.user) {
          localStorage.setItem('hr_user', JSON.stringify(res.data.user));
          setState(p => localStorage.getItem('hr_token') === token ? { ...p, token, user: res.data.user } : p);
        }
      }).catch(() => undefined);
    };

    const syncOtherTab = (event: StorageEvent) => {
      if (event.key === null || event.key === 'hr_token') refreshUser();
    };
    window.addEventListener('storage', syncOtherTab);
    window.addEventListener('focus', refreshUser);
    document.addEventListener('visibilitychange', refreshUser);
    return () => {
      window.removeEventListener('storage', syncOtherTab);
      window.removeEventListener('focus', refreshUser);
      document.removeEventListener('visibilitychange', refreshUser);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const operation = ++authOperation.current;
    const response = await authApi.login(email, password);
    if (operation !== authOperation.current) return;
    const { token, user } = response.data;
    localStorage.setItem('hr_token', token);
    localStorage.setItem('hr_user', JSON.stringify(user));
    setState({ user, token, isLoading: false });
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    const operation = ++authOperation.current;
    localStorage.setItem('hr_token', token);
    try {
      const response = await authApi.me();
      if (operation !== authOperation.current || localStorage.getItem('hr_token') !== token) return;
      const user = response.data.user;
      localStorage.setItem('hr_user', JSON.stringify(user));
      setState({ user, token, isLoading: false });
    } catch (err) {
      if (operation === authOperation.current && localStorage.getItem('hr_token') === token) {
        localStorage.removeItem('hr_token');
        localStorage.removeItem('hr_user');
      }
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    authOperation.current++;
    localStorage.removeItem('hr_token');
    localStorage.removeItem('hr_user');
    setState({ user: null, token: null, isLoading: false });
  }, []);

  const setSession = useCallback((user: UserInfo, token: string) => {
    authOperation.current++;
    localStorage.setItem('hr_token', token);
    localStorage.setItem('hr_user', JSON.stringify(user));
    setState({ user, token, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      loginWithToken,
      logout,
      setSession,
      isAdmin: state.user?.role === 'ADMIN' || state.user?.role === 'SUPER_ADMIN',
      isLoggedIn: !!state.token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

