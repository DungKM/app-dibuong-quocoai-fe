// src/components/DepartmentModal.tsx
import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/auth.api";
import { createPortal } from "react-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data?: any;
  departments: any[];
}

export const DepartmentModal = ({ isOpen, onClose, data, departments }: Props) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    type: "KHOA",
    parentId: "",
    idHis: ""
  });

  // ✅ Đưa useEffect lên trên câu lệnh return
  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || "",
        type: data.type || "KHOA",
        parentId: data.parentId || "",
        idHis: data.idHis || ""
      });
    } else {
      setFormData({ name: "", type: "KHOA", parentId: "", idHis: "" });
    }
  }, [data, isOpen]);

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      data ? authApi.updateDepartment(data._id, payload) : authApi.createDepartment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      onClose();
    }
  });

  // Nếu Modal đóng, không render gì cả
  if (!isOpen) return null;

  // ✅ Chỉ sử dụng MỘT câu lệnh return và bọc toàn bộ giao diện vào createPortal
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Lớp nền mờ phủ kín màn hình */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Nội dung Modal */}
      <div className="relative bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
        <h2 className="text-2xl font-black text-slate-800 uppercase mb-6 tracking-tighter">
          {data ? "Cập nhật" : "Thêm mới"} Khoa/Phòng
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">ID từ phần mềm (HIS)</label>
            <input
              value={formData.idHis}
              onChange={e => setFormData({ ...formData, idHis: e.target.value })}
              placeholder="Ví dụ: K01, P102..."
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 ring-primary/20"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tên gọi</label>
            <input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Phân loại</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value, parentId: "" })}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
              >
                <option value="KHOA">KHOA</option>
                <option value="PHONG">PHÒNG</option>
              </select>
            </div>

            {formData.type === "PHONG" && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Thuộc Khoa</label>
                <select
                  value={formData.parentId}
                  onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                >
                  <option value="">Chọn khoa...</option>
                  {departments
                    .filter(d => d.type === "KHOA")
                    .map(k => (
                      <option key={k._id} value={k._id}>{k.name}</option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 font-black text-slate-400 uppercase text-xs hover:text-slate-600 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending}
            className="flex-1 py-4 bg-[#1EADED] text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-sky-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {mutation.isPending ? "Đang lưu..." : "Lưu dữ liệu"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};