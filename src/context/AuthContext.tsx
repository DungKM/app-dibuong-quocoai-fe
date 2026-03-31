import React, { createContext, useContext, useMemo, useState } from "react";
import { authApi, authStorage, getUserIdFromToken } from "@/services/auth.api";
import type { AuthUser, Role } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const USERNAME_KEY = "username";
const USER_ID_KEY = "userId";
const ID_KHOA_KEY = "idKhoa";
const TEN_KHOA = "TenKhoa";
const ID_HIS_KEY = "idHis";

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const role = authStorage.getRole();
    const access = authStorage.getAccessToken();
    const username = localStorage.getItem(USERNAME_KEY);
    const userId = localStorage.getItem(USER_ID_KEY);
    const idKhoa = localStorage.getItem(ID_KHOA_KEY);
    const tenKhoa = localStorage.getItem(TEN_KHOA);
    const idHis = localStorage.getItem(ID_HIS_KEY);
    const tokenUserId = userId || getUserIdFromToken(access);
    if (!userId && tokenUserId) localStorage.setItem(USER_ID_KEY, tokenUserId);

    return access && role && username
      ? {
        id: tokenUserId || null,
        username,
        role,
        idKhoa: idKhoa || null,
        tenKhoa: tenKhoa || null,
        idHis: idHis || null,
      }
      : null;
  });

  const isAuthenticated = !!authStorage.getAccessToken();

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,

      login: async (username, password) => {
        const res = await authApi.login(username, password);
        const userId = res.id || res._id || res.userId || getUserIdFromToken(res.accessToken) || null;

        localStorage.setItem(USERNAME_KEY, res.username || username);
        if (userId) localStorage.setItem(USER_ID_KEY, userId);
        else localStorage.removeItem(USER_ID_KEY);
        localStorage.setItem(ID_KHOA_KEY, res.idKhoa ?? "");
        localStorage.setItem(TEN_KHOA, res.tenKhoa ?? "");
        localStorage.setItem(ID_HIS_KEY, res.idHis ?? ""); 

        setUser({
          id: userId,
          username: res.username || username,
          role: res.role as Role,
          idKhoa: res.idKhoa ?? null,
          tenKhoa: res.tenKhoa ?? null,
          idHis: res.idHis ?? null, 
        });

        return true;
      },

      logout: async () => {
        await authApi.logout();
        localStorage.removeItem(USERNAME_KEY);
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(ID_KHOA_KEY);
        localStorage.removeItem(TEN_KHOA);
        setUser(null);
      },
    }),
    [user, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
