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

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${authStorage.getAccessToken()}`,
});


const authenticatedRequest = async (url: string, options: RequestInit) => {
  let res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...getAuthHeaders(),
    },
  });

  if (res.status === 401) {
    try {
      console.log("Token expired, attempting auto-refresh...");
      await authApi.refresh();

      res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...getAuthHeaders(),
        },
      });
    } catch (refreshError) {
      authStorage.clear();
      window.location.href = "/#/login";
      throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }

  return res;
};

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      let message = "Đăng nhập thất bại";
      const errorBody = await res.json().catch(() => null);
      const serverMsg = errorBody?.message as string | undefined;

      if (res.status === 400) message = "Vui lòng nhập tên đăng nhập và mật khẩu.";
      if (res.status === 401) message = "Tên đăng nhập hoặc mật khẩu không đúng.";
      if (res.status === 403) message = "Tài khoản chưa được cấp quyền truy cập.";
      if (res.status >= 500) message = "Hệ thống đang bận. Vui lòng thử lại sau.";

      if (serverMsg && !/invalid credentials/i.test(serverMsg)) {
        message = serverMsg;
      }

      throw new Error(message);
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

  logout: async () => {
    const refreshToken = authStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      authStorage.clear();
    }
  },

  // --- CÁC HÀM QUẢN TRỊ NGƯỜI DÙNG (ADMIN) ---

  getUsers: async () => {
    const res = await authenticatedRequest(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users`, {
      method: "GET"
    });
    if (!res.ok) throw new Error("Không thể tải danh sách nhân viên");
    const result = await res.json();
    return result.data;
  },

  updateUser: async (id: string, payload: any) => {
    const res = await authenticatedRequest(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users/${id}`, {
      method: "PATCH", // Hoặc "PUT" tùy theo thiết kế Backend của bạn
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Lỗi khi cập nhật tài khoản");
    }
    return await res.json();
  },

  createUser: async (payload: any) => {
    const res = await authenticatedRequest(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Lỗi khi tạo tài khoản");
    }
    return await res.json();
  },

  updateStatus: async (id: string, isActive: boolean) => {
    const res = await authenticatedRequest(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error("Lỗi khi cập nhật trạng thái");
    return await res.json();
  },

  resetPassword: async (id: string, newPassword: string) => {
    const res = await authenticatedRequest(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) throw new Error("Lỗi khi đặt lại mật khẩu");
    return await res.json();
  },

  // --- CÁC HÀM QUẢN TRỊ KHOA PHÒNG (ADMIN) ---

  getDepartments: async () => {
    const res = await authenticatedRequest(`${env.API_BACKEND_AUTH_NODE_URL}/auth/departments`, {
      method: "GET"
    });
    if (!res.ok) throw new Error("Không thể tải danh sách khoa phòng");
    const result = await res.json();
    return result.data;
  },

  createDepartment: async (payload: { name: string; type: 'KHOA' | 'PHONG'; parentId?: string; idHis?: string }) => {
    const res = await authenticatedRequest(`${env.API_BACKEND_AUTH_NODE_URL}/auth/departments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Lỗi khi tạo khoa phòng");
    }
    return await res.json();
  },

  updateDepartment: async (id: string, payload: { name?: string; type?: 'KHOA' | 'PHONG'; parentId?: string; idHis?: string }) => {
    const res = await authenticatedRequest(`${env.API_BACKEND_AUTH_NODE_URL}/auth/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Lỗi khi cập nhật");
    }
    return await res.json();
  },

  deleteDepartment: async (id: string) => {
    const res = await authenticatedRequest(`${env.API_BACKEND_AUTH_NODE_URL}/auth/departments/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Không thể xóa khoa phòng");
    }
    return true;
  },
};