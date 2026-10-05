"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";

const AuthContext = createContext({
  user: null,
  loading: true,
  setUser: () => {},
  refresh: async () => null,
  logout: async () => {},
});

/**
 * وضعیت ورود کاربر رو یک‌بار از /api/auth/me می‌گیره و به کل سایت (هدر، منوی پایین، ...) می‌ده.
 * layout رو dynamic نمی‌کنه؛ صفحه‌ها همچنان می‌تونن static بمونن.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  const refresh = useCallback(async () => {
    try {
      const data = await api("GET", "/api/auth/me");
      setState({ user: data.user ?? null, loading: false });
      return data.user ?? null;
    } catch {
      setState((s) => ({ ...s, loading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setUser = useCallback((user) => setState({ user, loading: false }), []);

  const logout = useCallback(async () => {
    try {
      await api("POST", "/api/auth/logout", {});
    } finally {
      setState({ user: null, loading: false });
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, setUser, refresh, logout }),
    [state, setUser, refresh, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
