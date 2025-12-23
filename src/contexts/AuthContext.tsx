import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getDisableExternalApiRuntime } from '../lib/devMode';

type User = {
  id: string;
  email: string;
  full_name: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const devMode = getDisableExternalApiRuntime();
      if (devMode) {
        // Developer Mode: simulate auth when token like 'dev-<id>' exists
        if (token && token.startsWith('dev-')) {
          const id = token.split('dev-')[1] || 'dev';
          setUser({ id, email: `${id}@example.com`, full_name: 'Dev User' });
        }
        setLoading(false);
        return;
      }

      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data.user);
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const devMode = getDisableExternalApiRuntime();
    if (devMode) {
      // simulate signup in developer mode
      const id = email.split('@')[0] || `dev${Date.now()}`;
      const token = `dev-${id}`;
      const user = { id, email, full_name: fullName || 'Dev User' };
      localStorage.setItem('token', token);
      setUser(user);
      return;
    }
    try {
      const { data } = await api.post('/auth/signup', { email, password, fullName });
      localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Signup failed');
    }
  };

  const signIn = async (email: string, password: string) => {
    const devMode = getDisableExternalApiRuntime();
    if (devMode) {
      // simulate signin
      const id = email.split('@')[0] || `dev${Date.now()}`;
      const token = `dev-${id}`;
      const user = { id, email, full_name: 'Dev User' };
      localStorage.setItem('token', token);
      setUser(user);
      return;
    }
    try {
      const { data } = await api.post('/auth/signin', { email, password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Signin failed');
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
