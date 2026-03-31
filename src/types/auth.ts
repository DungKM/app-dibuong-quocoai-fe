export type Role = "admin" | "doctor" | "nurse";

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  role: Role;
  username?: string;  
  id?: string | null;
  _id?: string | null;
  userId?: string | null;
  idKhoa?: string | null;
  tenKhoa?: string | null;
  idHis?: string | null;
};

export type AuthUser = {
  id?: string | null;
  username: string;
  role: Role;
  idKhoa?: string | null;
  tenKhoa?: string | null;
  idHis: string | null;
};
