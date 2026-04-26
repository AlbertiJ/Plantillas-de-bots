import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { apiFetch, ApiError } from "@/lib/api";

export interface AuthUser {
  id: string;
  username: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  randomPassword: () => Promise<string>;
  setLocked: (locked: boolean) => Promise<{ ok: boolean }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ ok: false, error: "no_provider" }),
  logout: async () => {},
  refresh: async () => {},
  changePassword: async () => ({ ok: false, error: "no_provider" }),
  randomPassword: async () => "",
  setLocked: async () => ({ ok: false }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await apiFetch<{ ok: boolean; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      const err = e as ApiError;
      return { ok: false, error: err.code ?? err.message };
    }
  }, []);

  const logout = useCallback(async () => {
    try { await apiFetch("/auth/logout", { method: "POST" }); } catch {}
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      const data = await apiFetch<{ ok: boolean; user: AuthUser }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      const err = e as ApiError;
      return { ok: false, error: err.code ?? err.message };
    }
  }, []);

  const randomPassword = useCallback(async () => {
    const data = await apiFetch<{ password: string }>("/auth/random-password", { method: "POST" });
    return data.password;
  }, []);

  const setLocked = useCallback(async (locked: boolean) => {
    try {
      const data = await apiFetch<{ ok: boolean; user: AuthUser }>("/auth/lock", {
        method: "POST",
        body: JSON.stringify({ locked }),
      });
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, changePassword, randomPassword, setLocked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
