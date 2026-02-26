import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/auth.api";
import { UserModal } from "@/components/UserModal";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";

export const UserAdminPage = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [resetUser, setResetUser] = useState<any>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  // Lấy thêm danh sách khoa phòng để truyền vào Modal
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: authApi.getDepartments
  });
  // 1. Lấy danh sách user từ API
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: authApi.getUsers
  });

  // 2. Xử lý đổi trạng thái (Sử dụng _id cho MongoDB)
  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => authApi.updateStatus(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] })
  });

  if (isLoading) return (
    <div className="p-20 text-center font-black animate-pulse text-sky-400 uppercase tracking-widest">
      Đang kết nối cơ sở dữ liệu...
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-10 space-y-8">

      {/* --- HEADER BANNER --- */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1EADED] to-blue-600 text-white rounded-[24px] flex items-center justify-center text-3xl shadow-xl shadow-sky-200">
            <i className="fa-solid fa-users-gear"></i>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Quản trị nhân sự</h1>
            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              {users?.length || 0} tài khoản hệ thống
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-[#1EADED] text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-sky-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <i className="fa-solid fa-plus"></i> THÊM TÀI KHOẢN
        </button>
      </div>

      {/* --- DANH SÁCH DẠNG BẢNG --- */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Tài khoản</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Vai trò</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Khoa / Phòng</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users?.map((user: any) => (
                <tr key={user._id || user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono text-slate-400">@{user.username}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-[#1EADED]'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-slate-500 uppercase">
                    {user.idKhoa?.name || <span className="text-slate-300 italic uppercase">Chưa phân khoa</span>}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => statusMutation.mutate({ id: user._id, active: !user.isActive })}
                      className={`flex items-center gap-2 font-black text-[10px] uppercase transition-all ${user.isActive ? 'text-emerald-500' : 'text-slate-300'
                        }`}
                    >
                      <i className={`fa-solid ${user.isActive ? 'fa-toggle-on text-lg' : 'fa-toggle-off text-lg'}`}></i>
                      {user.isActive ? 'Đang mở' : 'Đã khóa'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsModalOpen(true);
                        }}
                        className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-primary rounded-xl transition-all"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => {
                          setResetUser(user);
                          setIsResetModalOpen(true);
                        }}
                        className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-amber-500 rounded-xl transition-all"
                      >
                        <i className="fa-solid fa-key"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Hiển thị {users?.length || 0} kết quả</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-400 cursor-not-allowed">Trình trước</button>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:border-primary">Trang sau</button>
          </div>
        </div>
        <UserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
          data={selectedUser}
          departments={departments}
        />
        <ResetPasswordModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          user={resetUser}
        />
      </div>
    </div>
  );
};