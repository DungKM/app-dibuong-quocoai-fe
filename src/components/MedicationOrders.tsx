import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDonThuocByPhieuKham } from "@/services/dibuong.api";
import type { CachDungJson, DonThuocItem, SplitQty } from "@/types/dibuong";
import { ShiftType } from "@/types/dibuong";

type Props = {
  idPhieuKham: string | null;
  shift: ShiftType;
  splitMap: Record<string, SplitQty>;
  filterTab: "PENDING" | "COMPLETED";
  splitLoading?: boolean;
  onPickDrug: (x: { idPhieuThuoc: string; ten: string; maxQty: number; lieuDung: string }) => void;
};

function formatDate(iso?: string | null) {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const MedicationOrders: React.FC<Props> = ({
  idPhieuKham,
  shift,
  splitMap,
  filterTab,
  splitLoading,
  onPickDrug,
}) => {
  const { data, isLoading, error } = useQuery<DonThuocItem[]>({
    queryKey: ["donthuoc", idPhieuKham],
    enabled: !!idPhieuKham,
    queryFn: () => getDonThuocByPhieuKham(idPhieuKham!),
  });

  const list = useMemo(() => {
    const raw = data ?? [];
    const key = shift as keyof SplitQty;

    return raw.map((it) => {
      const idPhieuThuoc = String(it.IdPhieuThuoc);
      const split = splitMap?.[idPhieuThuoc];
      const hasBeenSplit = !!split;

      return {
        raw: it,
        idPhieuThuoc,
        hasBeenSplit,
        qtyInShift: split ? Number(split[key] ?? 0) : 0,
        isVisible: filterTab === "PENDING"
          ? true
          : (hasBeenSplit && split[key] > 0)
      };
    }).filter(x => x.isVisible);
  }, [data, shift, splitMap, filterTab]);

  if (!idPhieuKham) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 font-bold mx-4">
        Chọn một lần khám để xem đơn thuốc.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 font-bold mx-4">
        Đang tải đơn thuốc...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-red-700 font-bold mx-4">
        Lỗi tải đơn thuốc: {String((error as any)?.message || error)}
      </div>
    );
  }

  return (
    <div className="space-y-4 mx-4">
      {splitLoading && <div className="text-[10px] font-bold text-primary animate-pulse px-2">Đang cập nhật dữ liệu chia ca...</div>}

      {list.map(({ raw: it, idPhieuThuoc, qtyInShift, hasBeenSplit }) => (
        <div
          key={idPhieuThuoc}
          className={`rounded-3xl border p-5 transition-all duration-300 shadow-sm ${hasBeenSplit && filterTab === "PENDING"
              ? "bg-green-50/50 border-green-200"
              : "bg-white border-slate-200"
            }`}
        >
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-lg font-black text-slate-900 leading-tight">{it.Ten}</div>
                {hasBeenSplit && filterTab === "PENDING" && (
                  <span className="bg-green-500 text-white text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-tighter">
                    <i className="fa-solid fa-check mr-1"></i> Đã chia
                  </span>
                )}
              </div>

              <div className="mt-1 text-[11px] font-bold text-slate-400">
                BS. {it.TenBacSiKeThuoc || "--"} • {formatDate(it.NgayKeThuoc)}
              </div>

              <div className="mt-3 space-y-1">
                <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <i className="fa-solid fa-box-archive text-slate-300 w-4"></i>
                  Tổng đơn: <span className="text-slate-900">{it.SoLuong} {it.DonVi}</span>
                </div>

                {it.LieuDung && (
                  <div className="text-xs font-bold text-amber-600 flex items-start gap-2">
                    <i className="fa-solid fa-comment-medical text-amber-300 w-4 mt-0.5"></i>
                    <span>HD: {it.LieuDung}</span>
                  </div>
                )}
              </div>
              {filterTab === "COMPLETED" && (
                <div className="mt-3 inline-flex items-center px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-black shadow-sm">
                  <i className="fa-solid fa-clock mr-2"></i>
                  Ca này uống: {qtyInShift} {it.DonVi}
                </div>
              )}
            </div>

            <button
              onClick={() => onPickDrug?.({
                idPhieuThuoc: it.IdPhieuThuoc,
                ten: it.Ten,
                maxQty: it.SoLuong ?? 0,
                lieuDung: it.LieuDung ?? ""
              })}
              className={`shrink-0 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${hasBeenSplit
                  ? "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                  : "bg-slate-900 text-white hover:bg-black shadow-md shadow-slate-200"
                }`}
            >
              <i className={`fa-solid ${hasBeenSplit ? 'fa-pen-to-square' : 'fa-plus'} mr-1`}></i>
              {hasBeenSplit ? "Sửa lại" : "Chia ngay"}
            </button>
          </div>
        </div>
      ))}

      {list.length === 0 && (
        <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-[40px] bg-slate-50/50">
          <div className="text-slate-400 font-black text-sm uppercase tracking-widest">
            {filterTab === "PENDING"
              ? "🎉 Hoàn thành chia thuốc!"
              : `Trống trong ca ${shift === "MORNING" ? "Sáng" : shift === "NOON" ? "Trưa" : shift === "AFTERNOON" ? "Chiều" : "Tối"}`
            }
          </div>
          <div className="text-slate-300 text-xs mt-1 font-bold">
            {filterTab === "PENDING" ? "Tất cả thuốc đã được xử lý xong." : "Không có thuốc nào được chỉ định dùng trong ca này."}
          </div>
        </div>
      )}
    </div>
  );
};