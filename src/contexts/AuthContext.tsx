import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  isLoggedIn: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  saveMarkdown: (filePath: string, content: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isLoggedIn: false,
  login: async () => false,
  logout: () => {},
  saveMarkdown: async () => false,
});

export function useAuth() {
  return useContext(AuthContext);
}

const SESSION_KEY = 'pixel_notes_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem(SESSION_KEY)
  );

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        sessionStorage.setItem(SESSION_KEY, data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    if (token) {
      fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }
    setToken(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, [token]);

  const saveMarkdown = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, path: filePath, content }),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, isLoggedIn: !!token, login, logout, saveMarkdown }}>
      {children}
    </AuthContext.Provider>
  );
}
