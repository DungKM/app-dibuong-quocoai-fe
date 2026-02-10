import React from "react";
import { createPortal } from "react-dom";

export const DrugSplitModal = ({ selectedDrug, setSelectedDrug, saveSplitMutation }: any) => {
    if (!selectedDrug) return null;

    const totalSplits = selectedDrug.splits.MORNING + selectedDrug.splits.NOON + 
                       selectedDrug.splits.AFTERNOON + selectedDrug.splits.NIGHT;

    return createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            {/* Lớp nền mờ phủ kín toàn bộ, kể cả Header */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDrug(null)} />
            
            <div className="relative bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Chia thuốc theo ca</div>
                        <h2 className="text-2xl font-black text-slate-900 mt-1">{selectedDrug.ten}</h2>
                    </div>
                    <button onClick={() => setSelectedDrug(null)} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { k: "MORNING", label: "Sáng", icon: "fa-sun" },
                        { k: "NOON", label: "Trưa", icon: "fa-cloud-sun" },
                        { k: "AFTERNOON", label: "Chiều", icon: "fa-cloud" },
                        { k: "NIGHT", label: "Tối", icon: "fa-moon" },
                    ].map((x) => (
                        <div key={x.k} className="bg-slate-50 border-2 border-slate-100 rounded-[24px] p-4 focus-within:border-primary transition-all">
                            <div className="flex items-center gap-2 mb-1">
                                <i className={`fa-solid ${x.icon} text-xs text-slate-400`}></i>
                                <span className="text-[10px] font-black text-slate-400 uppercase">{x.label}</span>
                            </div>
                            <input
                                type="number" step="0.5" min={0}
                                value={selectedDrug.splits[x.k]}
                                onChange={(e) => setSelectedDrug((prev: any) => ({
                                    ...prev, splits: { ...prev.splits, [x.k]: Number(e.target.value || 0) }
                                }))}
                                className="w-full bg-transparent font-black text-2xl text-slate-900 outline-none"
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase">Trạng thái chia</div>
                        <div className={`text-xl font-black ${totalSplits === selectedDrug.maxQty ? "text-emerald-500" : "text-red-500"}`}>
                            {totalSplits} / {selectedDrug.maxQty}
                        </div>
                    </div>
                    <button
                        disabled={totalSplits !== selectedDrug.maxQty || saveSplitMutation.isPending}
                        onClick={() => {
                            saveSplitMutation.mutate({ idPhieuThuoc: selectedDrug.idPhieuThuoc, splits: selectedDrug.splits });
                            setSelectedDrug(null);
                        }}
                        className="px-8 py-4 bg-primary text-white rounded-[24px] font-black uppercase text-xs shadow-lg shadow-blue-100 disabled:opacity-50 transition-all active:scale-95"
                    >
                        Lưu kết quả
                    </button>
                </div>
            </div>
        </div>,
        document.body // ✅ Đưa hẳn ra ngoài body để đè lên Header
    );
};