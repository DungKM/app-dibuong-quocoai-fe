// src/pages/DepartmentAdminPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/auth.api";
import { DepartmentModal } from "@/components/DepartmentModal";

export const DepartmentAdminPage = () => {
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState<any>(null);

    const { data: departments, isLoading } = useQuery({
        queryKey: ["departments"],
        queryFn: authApi.getDepartments
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => authApi.deleteDepartment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            alert("Đã xóa thành công!");
        },
        onError: (error: any) => alert(error.message)
    });

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Bạn có chắc muốn xóa ${name}?`)) {
            deleteMutation.mutate(id);
        }
    };
    return (
        <div className="max-w-[1400px] mx-auto p-4 md:p-10 space-y-8">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-[24px] flex items-center justify-center text-3xl shadow-xl shadow-purple-100">
                        <i className="fa-solid fa-sitemap"></i>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cấu trúc tổ chức</h1>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">Quản lý Khoa & Phòng trực thuộc</p>
                    </div>
                </div>
                <button
                    onClick={() => { setEditData(null); setIsModalOpen(true); }}
                    className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all"
                >
                    <i className="fa-solid fa-plus mr-2"></i> THÊM MỚI
                </button>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">ID Phần mềm</th>
                            <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Tên đơn vị</th>
                            <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Phân cấp</th>
                            <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {departments?.map((dept: any) => (
                            <tr key={dept._id} className="hover:bg-purple-50/30 transition-colors group">
                                <td className="px-8 py-4 font-mono text-xs font-bold text-slate-400">
                                    {dept.idHis || "N/A"}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-black text-slate-700 uppercase text-sm tracking-tight">{dept.name}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {dept.type === 'KHOA' ? (
                                        <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">KHOA CHỦ QUẢN</span>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase w-fit">PHÒNG TRỰC THUỘC</span>
                                            <span className="text-[10px] font-bold text-slate-400 mt-1 italic">Thuộc: {dept.parentName || "..."}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => { setEditData(dept); setIsModalOpen(true); }}
                                            className="w-9 h-9 text-slate-300 hover:text-[#1EADED] transition-all"
                                        >
                                            <i className="fa-solid fa-pen-to-square"></i>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(dept._id, dept.name)}
                                            className="w-9 h-9 text-slate-300 hover:text-red-500 transition-all"
                                        >
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    </td>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <DepartmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={editData}
                departments={departments || []}
            />
        </div>
    );
};