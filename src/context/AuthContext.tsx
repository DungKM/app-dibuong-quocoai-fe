import React, { createContext, useContext, useMemo, useState } from "react";
import { authApi, authStorage } from "@/services/auth.api";
import type { AuthUser, Role } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const USERNAME_KEY = "username";
const ID_KHOA_KEY = "idKhoa";
const TEN_KHOA = "TenKhoa";
const ID_HIS_KEY = "idHis";

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const role = authStorage.getRole();
    const access = authStorage.getAccessToken();
    const username = localStorage.getItem(USERNAME_KEY);
    const idKhoa = localStorage.getItem(ID_KHOA_KEY);
    const tenKhoa = localStorage.getItem(TEN_KHOA);
    const idHis = localStorage.getItem(ID_HIS_KEY);

    return access && role && username
      ? {
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

        localStorage.setItem(USERNAME_KEY, res.username || username);
        localStorage.setItem(ID_KHOA_KEY, res.idKhoa ?? "");
        localStorage.setItem(TEN_KHOA, res.tenKhoa ?? "");
        localStorage.setItem(ID_HIS_KEY, res.idHis ?? ""); 

        setUser({
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
