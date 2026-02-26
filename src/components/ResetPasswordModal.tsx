import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/services/auth.api";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";

export const ResetPasswordModal = ({ isOpen, onClose, user }: any) => {
  const [newPassword, setNewPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword(user._id, newPassword),
    onSuccess: () => {
      toast.success(`Đã đổi mật khẩu cho ${user.fullName}`);
      setNewPassword("");
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!isOpen || !user) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-200">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
          <i className="fa-solid fa-key"></i>
        </div>
        
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Cấp mật khẩu mới</h2>
        <p className="text-slate-400 text-xs font-bold mb-6 mt-1 uppercase">Tài khoản: @{user.username}</p>

        <input
          type="password"
          placeholder="Nhập mật khẩu mới..."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 ring-amber-500/20 mb-6"
          autoFocus
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 font-black text-slate-400 uppercase text-[10px]">Hủy</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!newPassword || mutation.isPending}
            className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-amber-100 disabled:opacity-50"
          >
            {mutation.isPending ? "Đang lưu..." : "Xác nhận đổi"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};