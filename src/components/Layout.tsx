import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import avatar from "@/assets/avatar.jpg";
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { env } from "@/config/env";

export const Layout: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNoti, setShowNoti] = useState(false);

  useEffect(() => {
    if (!user?.idKhoa) return;

    const socket = io(env.API_BACKEND_AUTH_NODE_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("✅ SOCKET connected:", socket.id);
      console.log("✅ JOIN khoa:", user.idKhoa);
      socket.emit("join_khoa", user.idKhoa);
    });

    socket.on("new_notification", (data) => {
      console.log("🔔 new_notification:", data);
      setNotifications((prev) => [data, ...prev]);
      toast.success(`BN ${data.tenBenhNhan} trả thuốc`);
    });

    socket.on("connect_error", (e) => {
      console.log("❌ connect_error:", e?.message || e);
    });

    return () => socket.disconnect();
  }, [user?.idKhoa]);
  console.log(user?.idKhoa);
  // Logic phân quyền (giữ nguyên của bạn)
  const isAdmin = user.role === UserRole.ADMIN;
  const isDoctor = user.role === UserRole.DOCTOR;
  const isNurse = user.role === UserRole.NURSE;

  const getRoleLabel = () => {
    if (isAdmin) return 'Quản trị viên';
    if (isDoctor) return 'Bác sĩ';
    if (isNurse) return 'Điều dưỡng';
    return 'Nhân viên';
  };

  const getRoleColorClass = () => {
    if (isAdmin) return 'text-purple-600';
    if (isDoctor) return 'text-primary';
    return 'text-success';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                <i className="fa-solid fa-hospital"></i>
              </div>
              <span className="font-bold text-lg text-slate-800">MediRound</span>
            </Link>

            <nav className="hidden md:flex gap-4">
              {/* Menu Đi buồng */}
              {(isDoctor || isAdmin || isNurse) && (
                <div className="relative group">
                  <button className={`text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1 ${location.pathname.startsWith('/treatment') ? 'text-primary bg-primary/5' : 'text-slate-600'}`}>
                    Đi buồng <i className="fa-solid fa-chevron-down text-[10px]"></i>
                  </button>
                  <div className="absolute top-full left-0 bg-white border border-slate-200 rounded-lg shadow-lg w-48 py-1 hidden group-hover:block animate-fade-in">
                    <Link to="/treatment" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Danh sách bệnh nhân</Link>
                  </div>
                </div>
              )}

              {/* Menu Cấp phát thuốc */}
              {(isNurse || isAdmin) && (
                <div className="relative group">
                  <button className={`text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1 ${location.pathname.startsWith('/medication') ? 'text-primary bg-primary/5' : 'text-slate-600'}`}>
                    Cấp phát thuốc <i className="fa-solid fa-chevron-down text-[10px]"></i>
                  </button>
                  <div className="absolute top-full left-0 bg-white border border-slate-200 rounded-lg shadow-lg w-56 py-1 hidden group-hover:block animate-fade-in">
                    <Link to="/rx/inbox" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-50">
                      <i className="fa-solid fa-inbox mr-2"></i>Tiếp nhận Y lệnh
                    </Link>
                    <Link to="/medication" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cấp phát tại khoa</Link>
                  </div>
                </div>
              )}

              {/* Menu Quản trị */}
              {isAdmin && (
                <div className="relative group">
                  <button className={`text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1 ${location.pathname.startsWith('/admin') ? 'text-primary bg-primary/5' : 'text-slate-600'}`}>
                    Quản trị <i className="fa-solid fa-chevron-down text-[10px]"></i>
                  </button>
                  <div className="absolute top-full left-0 bg-white border border-slate-200 rounded-lg shadow-lg w-48 py-1 hidden group-hover:block animate-fade-in">
                    <Link to="/admin/users" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-50">Người dùng</Link>
                    <Link to="/admin/departments" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Khoa Phòng</Link>
                  </div>
                </div>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* CHUÔNG THÔNG BÁO */}
            <div className="relative">
              <button
                onClick={() => setShowNoti(!showNoti)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all relative ${showNoti ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400'}`}
              >
                <i className="fa-solid fa-bell text-lg"></i>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNoti && (
                <>
                  {/* Overlay để đóng khi nhấn ra ngoài */}
                  <div className="fixed inset-0 z-[55]" onClick={() => setShowNoti(false)} />
                  <div className="absolute top-full right-0 mt-3 w-80 bg-white border border-slate-200 rounded-[32px] shadow-2xl py-4 z-[60] animate-in fade-in slide-in-from-top-2">
                    <div className="px-6 pb-3 border-b border-slate-50 flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-widest">
                      <span>Thông báo</span>
                      <button onClick={() => setNotifications([])} className="text-primary hover:underline lowercase font-bold">Xóa tất cả</button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 font-bold uppercase text-xs">
                          <i className="fa-solid fa-bell-slash text-2xl mb-2 block"></i> Không có thông báo
                        </div>
                      ) : (
                        notifications.map((n, idx) => (
                          <div key={idx} className="px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 text-sm">
                              <i className="fa-solid fa-pills"></i>
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800 uppercase italic">
                                {n.tenBenhNhan} <span className="text-slate-400 not-italic">#{n.maBenhNhan}</span>
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1 font-medium italic">
                                Trả {n.soLuongTra} {n.tenThuoc}
                              </p>
                              <p className="text-[9px] text-slate-300 font-bold mt-2 uppercase italic tracking-tighter">
                                Vừa xong • Khoa {user.tenKhoa}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Đăng xuất */}
            <button onClick={logout} className="text-xs font-bold px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
              <i className="fa-solid fa-right-from-bracket mr-1"></i>Đăng xuất
            </button>

            {/* Profile */}
            <Link to="/profile" className="flex items-center gap-2 border-l pl-4 border-slate-200 group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition">{user.name}</p>
                <p className={`text-[10px] ${getRoleColorClass()} font-black uppercase italic tracking-widest`}>{getRoleLabel()}</p>
              </div>
              <img src={avatar} className="w-8 h-8 rounded-full border border-slate-200 group-hover:border-primary transition" alt="Avatar" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-24 sm:pb-6 italic font-medium">
        <Outlet />
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-2 z-40 pb-[env(safe-area-inset-bottom,20px)] shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        <Link to="/patients" className="flex flex-col items-center gap-1 min-w-[64px] text-slate-400">
          <i className="fa-solid fa-bed-pulse text-lg"></i>
          <span className="text-[10px] font-bold">Đi buồng</span>
        </Link>
        <Link to="/rx/inbox" className="flex flex-col items-center gap-1 min-w-[64px] text-slate-400">
          <i className="fa-solid fa-inbox text-lg"></i>
          <span className="text-[10px] font-bold">Y lệnh</span>
        </Link>
        <Link to="/medication" className="flex flex-col items-center gap-1 min-w-[64px] text-slate-400">
          <i className="fa-solid fa-microscope text-lg"></i>
          <span className="text-[10px] font-bold">Thuốc</span>
        </Link>
      </nav>
    </div>
  );
};