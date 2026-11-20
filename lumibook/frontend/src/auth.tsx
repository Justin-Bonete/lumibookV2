import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';
import type { Me } from './types';

interface Ctx {
  me: Me | null; loading: boolean;
  login(email: string, password: string): Promise<{ challenge?: string }>;
  verifyTwoFactor(challenge: string, code: string, recovery?: boolean): Promise<void>;
  register(name: string, email: string, password: string, confirm: string): Promise<void>;
  logout(): Promise<void>; refresh(): Promise<void>;
}
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  const refresh = useCallback(async () => {
    if (!getToken()) { setMe(null); setLoading(false); return; }
    try { setMe(await api<Me>('/me')); } catch { setToken(null); setMe(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email: string, password: string) => {
    const r = await api<{ token?: string; two_factor?: boolean; challenge?: string }>('/login', { method: 'POST', body: { email, password } });
    if (r.two_factor) return { challenge: r.challenge }; // password OK, authenticator code still needed
    setToken(r.token!);
    await refresh();
    return {};
  };
  const verifyTwoFactor = async (challenge: string, code: string, recovery = false) => {
    const r = await api<{ token: string }>('/login/two-factor', { method: 'POST', body: recovery ? { challenge, recovery_code: code } : { challenge, code } });
    setToken(r.token);
    await refresh();
  };
  const register = async (name: string, email: string, password: string, password_confirmation: string) => {
    const r = await api<{ token: string }>('/register', { method: 'POST', body: { name, email, password, password_confirmation } });
    setToken(r.token);
    await refresh();
  };
  const logout = async () => { try { await api('/logout', { method: 'POST' }); } catch { /* already signed out */ } setToken(null); setMe(null); };

  return <AuthCtx.Provider value={{ me, loading, login, verifyTwoFactor, register, logout, refresh }}>{children}</AuthCtx.Provider>;
}
