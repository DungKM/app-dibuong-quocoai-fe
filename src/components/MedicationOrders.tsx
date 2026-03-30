import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDonThuocByPhieuKham } from "@/services/dibuong.api";
import type { DonThuocItem, SplitQty } from "@/types/dibuong";
import { ShiftType } from "@/types/dibuong";

interface MedSplitInfo {
  splits: SplitQty;
  status: string;
  confirmedShifts?: string[];
  returnHistory?: Array<{
    quantity: number;
    reason: string;
    shift?: "MORNING" | "NOON" | "AFTERNOON" | "NIGHT";
  }>;
}

type Props = {
  idPhieuKham: string | null;
  shift: ShiftType;
  splitMap: Record<string, MedSplitInfo>;
  filterTab: "PENDING" | "COMPLETED";
  splitLoading?: boolean;
  onPickDrug: (x: { idPhieuThuoc: string; ten: string; maxQty: number; lieuDung: string }) => void;
  onAction: (data: { idPhieuThuoc: string; ten: string; qty: number; type: "CONFIRM" | "RETURN" }) => void;
};

export const MedicationOrders: React.FC<Props> = ({
  idPhieuKham, shift, splitMap, filterTab, splitLoading, onPickDrug, onAction,
}) => {
  const { data, isLoading } = useQuery<DonThuocItem[]>({
    queryKey: ["donthuoc", idPhieuKham],
    enabled: !!idPhieuKham,
    queryFn: () => getDonThuocByPhieuKham(idPhieuKham!),
  });

  const list = useMemo(() => {
    const raw = data ?? [];
    const key = shift as keyof SplitQty;

    return raw.map((it) => {
      const idPhieuThuoc = String(it.IdPhieuThuoc);
      const info = splitMap?.[idPhieuThuoc];
      const qtyInShift = info?.splits ? Number(info.splits[key] ?? 0) : 0;
      const totalReturned =
        info?.returnHistory?.reduce((sum, item) => {
          return item.shift === shift ? sum + item.quantity : sum;
        }, 0) ?? 0;
      const availableQty = Math.max(0, qtyInShift - totalReturned);
      const hasBeenSplit = !!info;
      const currentStatus = info?.status || "Chờ dùng thuốc";
      const isShiftConfirmed = info?.confirmedShifts?.includes(shift) ?? false;

      return {
        raw: it,
        idPhieuThuoc,
        hasBeenSplit,
        currentStatus,
        qtyInShift,
        availableQty,
        totalReturned,
        isShiftConfirmed,
        isVisible: filterTab === "PENDING" ? true : (hasBeenSplit && qtyInShift > 0)
      };
    }).filter(x => x.isVisible);
  }, [data, shift, splitMap, filterTab]);

  if (!idPhieuKham || isLoading) return null;

  return (
    <div className="space-y-4 mx-4 pb-10">
      {splitLoading && <div className="text-[10px] font-black text-primary animate-pulse px-4 uppercase tracking-widest">Đang đồng bộ dữ liệu...</div>}
      {list.length === 0 && (
        <div className="text-center text-slate-400 italic text-sm font-black uppercase tracking-widest py-10">
          {filterTab === "PENDING" ? "Chưa có thuốc nào được chia ca" : "Không có thuốc nào đã được chia ca"}
        </div>
      )
      }
      {list.map(({ raw: it, idPhieuThuoc, qtyInShift, availableQty, totalReturned, hasBeenSplit, currentStatus, isShiftConfirmed }) => {
        const canAction = availableQty > 0 && !isShiftConfirmed;
        return (
          <div key={idPhieuThuoc} className={`relative rounded-[32px] border transition-all duration-300 ${hasBeenSplit && filterTab === "PENDING" ? "bg-[#f8fdfb] border-[#e2f3ee]" : "bg-white border-slate-100 shadow-sm"
            }`}>
            <div className="p-6">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black text-[#1a202c] leading-tight">{it.Ten}</h3>
                    {filterTab === "COMPLETED" && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ${currentStatus === "Đã dùng thuốc" ? "bg-emerald-500 text-white" :
                        availableQty === 0 ? "bg-rose-500 text-white" : "bg-blue-500 text-white"
                        }`}>
                        {availableQty === 0 && currentStatus !== "Đã dùng thuốc" ? "Đã trả hết" : currentStatus}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-slate-400 font-bold text-[11px]">
                    <i className="fa-solid fa-layer-group opacity-40"></i>
                    <span>Tổng đơn: {it.SoLuong} {it.DonVi}</span>
                  </div>
                </div>

                {/* Nút Sửa/Chia ca (Theo bố cục ảnh image_cfe33b.png) */}
                {filterTab === "PENDING" && (
                  <button
                    onClick={() => onPickDrug({ idPhieuThuoc: it.IdPhieuThuoc, ten: it.Ten, maxQty: it.SoLuong ?? 0, lieuDung: it.LieuDung ?? "" })}
                    className={`shrink-0 flex flex-col items-center justify-center gap-1 h-16 w-24 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${hasBeenSplit
                      ? "bg-white border border-slate-200 text-slate-500 shadow-sm"
                      : "bg-[#0f172a] text-white shadow-xl shadow-slate-200"
                      }`}
                  >
                    <i className={`fa-solid ${hasBeenSplit ? 'fa-pen-to-square' : 'fa-plus-circle'} text-lg`}></i>
                    {hasBeenSplit ? "SỬA CA" : "CHIA NGAY"}
                  </button>
                )}
              </div>
              <div className="bg-[#fff9eb] border border-[#ffecd1] rounded-2xl p-4 flex gap-3 items-start mb-2">
                <div className="w-8 h-8 rounded-xl bg-[#f59e0b] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <i className="fa-solid fa-hand-holding-medical"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-[#b45309] uppercase tracking-widest mb-0.5">Hướng dẫn liều dùng</p>
                  <p className="text-sm font-bold text-[#78350f] leading-tight">{it.LieuDung || "Theo chỉ dẫn của bác sĩ"}</p>
                </div>
              </div>
              {filterTab === "COMPLETED" && (
                <div className="mt-4 pt-4 border-t border-slate-50">
                  <div className="flex gap-2 flex-wrap mb-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase border border-slate-200/50">Ca này: {qtyInShift}</span>
                    {totalReturned > 0 && <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase border border-rose-100">Đã trả: {totalReturned}</span>}
                    <span className="px-3 py-1 bg-primary text-white rounded-xl text-[10px] font-black uppercase shadow-sm">Còn lại: {availableQty} {it.DonVi}</span>
                  </div>

                  <div className="flex gap-2">
                    {canAction ? (
                      <>
                        <button
                          onClick={() => onAction({ idPhieuThuoc, ten: it.Ten, qty: availableQty, type: "CONFIRM" })}
                          className="flex-[2] bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <i className="fa-solid fa-check-circle"></i> Dùng {availableQty} {it.DonVi}
                        </button>
                        <button
                          onClick={() => onAction({ idPhieuThuoc, ten: it.Ten, qty: availableQty, type: "RETURN" })}
                          className="flex-1 bg-rose-50 text-rose-600 py-4 rounded-2xl font-black text-xs uppercase border border-rose-100 active:scale-95 flex items-center justify-center gap-2"
                        >
                          <i className="fa-solid fa-reply"></i> Trả
                        </button>
                      </>
                    ) : (
                      <div className="w-full py-4 bg-slate-50 text-slate-400 text-center text-[10px] font-black uppercase rounded-2xl border border-slate-100 italic tracking-[0.2em]">
                        {isShiftConfirmed
                          ? "✓ ĐÃ DÙNG CA NÀY"           // 👈 message rõ ràng hơn
                          : availableQty === 0 && currentStatus !== "Đã dùng thuốc"
                            ? "ĐÃ XỬ LÝ TRẢ HẾT"
                            : `TRẠNG THÁI: ${currentStatus}`
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};