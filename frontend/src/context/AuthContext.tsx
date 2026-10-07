import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
          if (res.data.success && res.data.user) {
            localStorage.setItem('hr_user', JSON.stringify(res.data.user));
            setState(p => ({ ...p, user: res.data.user }));
          }
        }).catch(err => {
          console.error('Background auth fetch failed', err);
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
      if (!localStorage.getItem('hr_token')) return;
      authApi.me().then(res => {
        if (res.data.success && res.data.user) {
          localStorage.setItem('hr_user', JSON.stringify(res.data.user));
          setState(p => ({ ...p, user: res.data.user }));
        }
      }).catch(() => undefined);
    };

    window.addEventListener('focus', refreshUser);
    document.addEventListener('visibilitychange', refreshUser);
    return () => {
      window.removeEventListener('focus', refreshUser);
      document.removeEventListener('visibilitychange', refreshUser);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { token, user } = response.data;
    localStorage.setItem('hr_token', token);
    localStorage.setItem('hr_user', JSON.stringify(user));
    setState({ user, token, isLoading: false });
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    localStorage.setItem('hr_token', token);
    try {
      const response = await authApi.me();
      const user = response.data.user;
      localStorage.setItem('hr_user', JSON.stringify(user));
      setState({ user, token, isLoading: false });
    } catch (err) {
      localStorage.removeItem('hr_token');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hr_token');
    localStorage.removeItem('hr_user');
    setState({ user: null, token: null, isLoading: false });
  }, []);

  const setSession = useCallback((user: UserInfo, token: string) => {
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

