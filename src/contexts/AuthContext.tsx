import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  isLoggedIn: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  saveMarkdown: (filePath: string, content: string) => Promise<boolean>;
  createPage: (filePath: string) => Promise<boolean>;
  deletePage: (filePath: string) => Promise<boolean>;
  renamePage: (oldPath: string, newPath: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isLoggedIn: false,
  login: async () => false,
  logout: () => {},
  saveMarkdown: async () => false,
  createPage: async () => false,
  deletePage: async () => false,
  renamePage: async () => false,
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

  const apiPost = useCallback(async (url: string, body: Record<string, string>): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...body }),
      });
      const data = await res.json();
      return data.success;
    } catch {
      return false;
    }
  }, [token]);

  const saveMarkdown = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    return apiPost('/api/save', { path: filePath, content });
  }, [apiPost]);

  const createPage = useCallback(async (filePath: string): Promise<boolean> => {
    return apiPost('/api/create-page', { path: filePath, content: '# New Page\n\n' });
  }, [apiPost]);

  const deletePage = useCallback(async (filePath: string): Promise<boolean> => {
    return apiPost('/api/delete-page', { path: filePath });
  }, [apiPost]);

  const renamePage = useCallback(async (oldPath: string, newPath: string): Promise<boolean> => {
    return apiPost('/api/rename-page', { oldPath, newPath });
  }, [apiPost]);

  return (
    <AuthContext.Provider value={{ token, isLoggedIn: !!token, login, logout, saveMarkdown, createPage, deletePage, renamePage }}>
      {children}
    </AuthContext.Provider>
  );
}
