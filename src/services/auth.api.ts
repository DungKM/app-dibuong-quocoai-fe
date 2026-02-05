import { env } from "@/config/env";
import type { LoginResponse, Role } from "@/types/auth";

const KEYS = {
  ACCESS: "accessToken",
  REFRESH: "refreshToken",
  ROLE: "role",
};

export const authStorage = {
  set: (access: string, refresh: string, role: Role) => {
    localStorage.setItem(KEYS.ACCESS, access);
    localStorage.setItem(KEYS.REFRESH, refresh);
    localStorage.setItem(KEYS.ROLE, role);
  },
  clear: () => Object.values(KEYS).forEach(k => localStorage.removeItem(k)),
  getAccessToken: () => localStorage.getItem(KEYS.ACCESS),
  getRefreshToken: () => localStorage.getItem(KEYS.REFRESH),
  getRole: () => localStorage.getItem(KEYS.ROLE) as Role | null,
};

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Login failed" }));
      throw new Error(error.message);
    }

    const data: LoginResponse = await res.json();
    authStorage.set(data.accessToken, data.refreshToken, data.role);
    return data;
  },

  refresh: async () => {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");

    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      authStorage.clear();
      throw new Error("Session expired");
    }

    const data = await res.json();
    authStorage.set(data.accessToken, data.refreshToken || refreshToken, data.role);
    return data.accessToken;
  },
};