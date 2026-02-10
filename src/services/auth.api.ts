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

// Hàm bổ trợ để tạo Headers có kèm Token
const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${authStorage.getAccessToken()}`,
});

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
  // ✅ BỔ SUNG HÀM LOGOUT
  logout: async () => {
    const refreshToken = authStorage.getRefreshToken();

    try {
      if (refreshToken) {
        // Gọi API thông báo cho server xóa refresh token
        await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      // Luôn dọn dẹp storage bất kể API có thành công hay không
      authStorage.clear();
    }
  },

  getUsers: async () => {
    let res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (res.status === 401) {
      try {
        console.log("Token hết hạn, đang tự động làm mới...");
        await authApi.refresh();

        res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users`, {
          method: "GET",
          headers: getAuthHeaders(),
        });
      } catch (refreshError) {
        authStorage.clear();
        window.location.href = "/login";
        throw new Error("Phiên làm việc hết hạn, vui lòng đăng nhập lại.");
      }
    }

    if (!res.ok) throw new Error("Không thể tải danh sách nhân viên");
    const result = await res.json();
    return result.data;
  },

  createUser: async (payload: any) => {
    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Lỗi khi tạo tài khoản");
    }
    return await res.json();
  },

  updateStatus: async (id: string, isActive: boolean) => {
    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error("Lỗi khi cập nhật trạng thái");
    return await res.json();
  },

  resetPassword: async (id: string, newPassword: string) => {
    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/users/${id}/reset-password`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) throw new Error("Lỗi khi đặt lại mật khẩu");
    return await res.json();
  },

  getDepartments: async () => {
    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/departments`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải danh sách khoa phòng");
    const result = await res.json();
    return result.data;
  },

  createDepartment: async (payload: { name: string; type: 'KHOA' | 'PHONG'; parentId?: string; idHis?: string }) => {
    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/departments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Lỗi khi tạo khoa phòng");
    }
    return await res.json();
  },

  updateDepartment: async (id: string, payload: { name?: string; type?: 'KHOA' | 'PHONG'; parentId?: string; idHis?: string }) => {
    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/departments/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Lỗi khi cập nhật");
    }
    return await res.json();
  },

  deleteDepartment: async (id: string) => {
    const res = await fetch(`${env.API_BACKEND_AUTH_NODE_URL}/auth/departments/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Không thể xóa khoa phòng");
    }
    return true;
  },
};