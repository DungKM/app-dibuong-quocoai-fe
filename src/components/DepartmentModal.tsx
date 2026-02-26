import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/auth.api";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data?: any;
  departments: any[];
}

export const DepartmentModal = ({ isOpen, onClose, data, departments }: Props) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: "", type: "KHOA", parentId: "", idHis: "" });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || "",
        type: data.type || "KHOA",
        parentId: data.parentId?._id || data.parentId || "",
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
      toast.success("Lưu dữ liệu thành công!");
      onClose();
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleSave = () => {
    if (!formData.name) return toast.error("Vui lòng nhập tên!");

    // Chuẩn hóa dữ liệu: type KHOA hoặc parentId rỗng thì gửi null
    const payload = {
      ...formData,
      parentId: (formData.type === "KHOA" || !formData.parentId) ? null : formData.parentId
    };
    mutation.mutate(payload);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-300">
        <h2 className="text-2xl font-black text-slate-800 uppercase mb-6 tracking-tighter">
          {data ? "Cập nhật" : "Thêm mới"} Khoa/Phòng
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">ID Phần mềm (HIS)</label>
            <input
              value={formData.idHis}
              onChange={e => setFormData({ ...formData, idHis: e.target.value })}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
              placeholder="K01, P102..."
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tên gọi</label>
            <input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Phân loại</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value, parentId: "" })}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700"
              >
                <option value="KHOA">KHOA</option>
                <option value="PHONG">PHÒNG</option>
              </select>
            </div>

            {formData.type === "PHONG" && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Thuộc Khoa (Mã HIS)</label>
                <select
                  value={formData.parentId}
                  onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none"
                >
                  <option value="">-- Chọn khoa --</option>
                  {departments
                    .filter(d => d.type === "KHOA")
                    .map(k => (
                      <option key={k._id} value={k.idHis}>
                        {k.name} ({k.idHis})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-4 font-black text-slate-400 uppercase text-xs">Hủy</button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="flex-1 py-4 bg-[#1EADED] text-white rounded-2xl font-black uppercase text-xs shadow-lg disabled:opacity-50 transition-all active:scale-95"
          >
            {mutation.isPending ? "Đang lưu..." : "Lưu dữ liệu"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};