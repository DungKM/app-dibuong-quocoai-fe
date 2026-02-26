import React from "react";
import { createPortal } from "react-dom";

export const DrugActionModal = ({
    actionDrug,
    setActionDrug,
    returnQty,
    setReturnQty,
    returnReason,
    setReturnReason,
    confirmMutation,
    returnMutation,
    onReturn // Thêm prop này từ MedicationDetail truyền xuống
}: any) => {
    if (!actionDrug) return null;

    const isConfirm = actionDrug.type === "CONFIRM";

    return createPortal(
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            {/* Lớp nền mờ phủ kín toàn màn hình */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActionDrug(null)} />

            <div className="relative bg-white w-full max-sm:max-w-xs max-w-sm rounded-[44px] p-8 shadow-2xl animate-in zoom-in duration-200">
                {/* Biểu tượng hành động */}
                <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-6 shadow-lg ${isConfirm ? "bg-emerald-50 text-emerald-500 shadow-emerald-100" : "bg-red-50 text-red-500 shadow-red-100"
                    }`}>
                    <i className={`fa-solid ${isConfirm ? "fa-hand-holding-medical" : "fa-undo"}`}></i>
                </div>

                <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase tracking-tighter">
                    {isConfirm ? "Xác nhận dùng thuốc" : "Yêu cầu trả thuốc"}
                </h3>

                {/* Thông tin thuốc hiển thị tóm tắt */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                    <div className="text-sm font-bold text-slate-900 text-center uppercase leading-tight">{actionDrug.ten}</div>
                    <div className="text-[10px] font-black text-primary mt-1 uppercase text-center tracking-widest">
                        Số lượng trong ca: {actionDrug.qty}
                    </div>
                </div>

                {/* --- KHÔI PHỤC GIAO DIỆN NHẬP LIỆU KHI TRẢ THUỐC --- */}
                {!isConfirm && (
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Số lượng thực trả</label>
                            <input
                                type="number"
                                max={actionDrug.qty}
                                min={1}
                                value={returnQty}
                                onChange={(e) => setReturnQty(Number(e.target.value))}
                                className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 font-black text-lg focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Lý do trả lại</label>
                                <select
                                    value={returnReason}
                                    onChange={(e) => setReturnReason(e.target.value)}
                                    className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-red-500 transition-all outline-none"
                                >
                                    <option value="">-- Chọn lý do --</option>
                                    <option value="Bệnh nhân từ chối">Bệnh nhân từ chối</option>
                                    <option value="Ra viện">Bệnh nhân ra viện</option>
                                    <option value="Bác sĩ ngừng thuốc">Bác sĩ ngừng thuốc</option>
                                    <option value="Khác">Lý do khác...</option>
                                </select>
                            </div>

                            {/* Ô nhập text tự do khi chọn "Khác" */}
                            {returnReason === "Khác" && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <textarea
                                        placeholder="Nhập lý do cụ thể..."
                                        rows={2}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-red-400"
                                        onChange={(e) => { window._otherReason = e.target.value; }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* NÚT BẤM HÀNH ĐỘNG */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => {
                            if (isConfirm) {
                                confirmMutation.mutate(actionDrug.idPhieuThuoc);
                                setActionDrug(null);
                            } else {
                                onReturn();
                            }
                        }}
                        disabled={!isConfirm && (!returnReason || returnQty <= 0)}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-40 ${isConfirm ? "bg-green-600 shadow-green-100" : "bg-red-600 shadow-red-100"
                            }`}
                    >
                        {isConfirm ? "Xác nhận dùng thuốc" : "Đồng ý trả thuốc"}
                    </button>
                    <button
                        onClick={() => setActionDrug(null)}
                        className="font-black text-[10px] text-slate-400 uppercase py-2 hover:text-slate-600 transition"
                    >
                        Hủy bỏ
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};