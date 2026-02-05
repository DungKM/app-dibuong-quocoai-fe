import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDonThuocByPhieuKham } from "@/services/dibuong.api";
import type { CachDungJson, DonThuocItem } from "@/types/dibuong";
import { ShiftType } from "@/types/dibuong";
import { SplitQty, ZERO } from "@/services/medSplit.api";

type Props = {
  idPhieuKham: string | null;
  shift: ShiftType;
  splitMap: Record<string, SplitQty>;
  splitLoading?: boolean;
  onPickDrug: (x: { idPhieuThuoc: string; ten: string }) => void;
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

function toneByStatus(status?: string | null) {
  if (status === "Đã dùng thuốc") return "bg-green-50 border-green-100 text-green-700";
  if (status === "Đã hủy thuốc" || status === "Đã huỷ thuốc") return "bg-slate-50 border-slate-200 text-slate-500";
  if (status === "Chờ dùng thuốc") return "bg-blue-50 border-blue-100 text-blue-700";
  return "bg-amber-50 border-amber-100 text-amber-700";
}

function parseCachDung(ghiChuJson?: string | null): CachDungJson[] {
  if (!ghiChuJson) return [];
  try {
    const x = JSON.parse(ghiChuJson);
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}

function mapShiftKey(shift: ShiftType) {
  return shift as keyof SplitQty;
}

function fallbackHasShiftFromGhiChu(ghiChuJson: string | null | undefined, shift: ShiftType) {
  const arr = parseCachDung(ghiChuJson);
  const x = arr?.[0];
  if (!x) return false;
  if (shift === ShiftType.MORNING) return !!x.ThoiGianSang;
  if (shift === ShiftType.NOON) return !!x.ThoiGianTrua;
  if (shift === ShiftType.AFTERNOON) return !!x.ThoiGianChieu;
  if (shift === ShiftType.NIGHT) return !!x.ThoiGianToi;
  return false;
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

    return raw
      .map((it) => {
        const idPhieuThuoc = String(it.IdPhieuThuoc);
        const split = splitMap?.[idPhieuThuoc];
        const hasBeenSplit = !!split;

        return {
          raw: it,
          idPhieuThuoc,
          hasBeenSplit,
          qtyInShift: split ? Number(split[key] ?? 0) : 0,
          // Tab COMPLETED: chỉ hiện nếu thuốc đó có số lượng > 0 trong ca đang chọn
          isVisibleInShift: split ? split[key] > 0 : false
        };
      })
      .filter((x) => {
        if (filterTab === "PENDING") {
          // Tab chưa chia: Hiện những thuốc chưa có dữ liệu trong splitMap
          return !x.hasBeenSplit;
        } else {
          // Tab đã chia: Hiện những thuốc đã chia VÀ có lịch uống trong ca (Sáng/Trưa...) đang chọn
          return x.hasBeenSplit && x.isVisibleInShift;
        }
      });
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
      {list.map(({ raw: it, idPhieuThuoc, qtyInShift, hasBeenSplit }) => (
        <div key={idPhieuThuoc} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-black text-slate-900">{it.Ten}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">Tổng đơn: {it.SoLuong} {it.DonVi}</div>

              {/* Hiển thị số lượng riêng cho ca nếu đã chia */}
              {filterTab === "COMPLETED" && (
                <div className="mt-3 inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-xl text-xs font-black">
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
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition ${hasBeenSplit ? "bg-slate-100 text-slate-600" : "bg-slate-900 text-white"
                }`}
            >
              {hasBeenSplit ? "Sửa lại" : "Chia ngay"}
            </button>
          </div>
        </div>
      ))}

      {list.length === 0 && (
        <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
          <div className="text-slate-300 font-bold text-sm">
            {filterTab === "PENDING" ? "🎉 Tuyệt vời, không còn thuốc nào chưa chia!" : `Hết thuốc trong ca ${shift === "MORNING" ? "Sáng" : shift}...`}
          </div>
        </div>
      )}
    </div>
  );
};
