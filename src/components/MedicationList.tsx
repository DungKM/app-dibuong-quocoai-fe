import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDonThuocByPhieuKham } from "@/services/dibuong.api";
import type { CachDungJson, DonThuocItem } from "@/types/dibuong";

type Props = {
  idPhieuKham: string | null; // selectedEncounterId
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

function buildFrequencyFromGhiChu(arr: CachDungJson[]) {
  if (!arr.length) return "";

  const x = arr[0];
  const times: string[] = [];
  if (x.ThoiGianSang) times.push(`Sáng ${x.ThoiGianSang}`);
  if (x.ThoiGianTrua) times.push(`Trưa ${x.ThoiGianTrua}`);
  if (x.ThoiGianChieu) times.push(`Chiều ${x.ThoiGianChieu}`);
  if (x.ThoiGianToi) times.push(`Tối ${x.ThoiGianToi}`);

  const day = x.SoNgayKe != null ? `${x.SoNgayKe} ngày` : "";
  const timeStr = times.length ? times.join(" • ") : "";
  return [timeStr, day].filter(Boolean).join(" • ");
}

export const MedicationList: React.FC<Props> = ({ idPhieuKham }) => {
  const { data, isLoading, error } = useQuery<DonThuocItem[]>({
    queryKey: ["donthuoc", idPhieuKham],
    enabled: !!idPhieuKham,
    queryFn: () => getDonThuocByPhieuKham(idPhieuKham!),
  });

  const meds = useMemo(() => {
    const list = data ?? [];

    // group theo MaDonThuoc nếu muốn; hiện UI của bạn chỉ cần list theo lần khám => dùng thẳng
    return list.map((it) => {
      const cd = parseCachDung(it.GhiChuLieuDung);

      const route = cd?.[0]?.CachDung ?? "--";
      const frequency = buildFrequencyFromGhiChu(cd) || "--";

      // dose hiển thị: ưu tiên LieuDung, fallback "Số lượng + đơn vị"
      const dose =
        it.LieuDung?.trim()
          ? it.LieuDung.trim()
          : it.SoLuong != null
          ? `${it.SoLuong}${it.DonVi ? ` ${it.DonVi}` : ""}`
          : "--";

      // note: bác sĩ + ngày kê (tuỳ bạn muốn)
      const meta = `${it.TenBacSiKeThuoc ?? "--"} • ${formatDate(it.NgayKeThuoc)}`;

      return {
        id: it.IdPhieuThuoc,
        drugName: it.Ten,
        dose,
        route,
        frequency,
        note: it.LieuDung ?? "",
        status: it.TrangThai ?? "--",
        meta,
      };
    });
  }, [data]);

  if (!idPhieuKham) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 font-bold">
        Chọn một lần khám để xem đơn thuốc.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 font-bold">
        Đang tải đơn thuốc...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-red-700 font-bold">
        Lỗi tải đơn thuốc: {String((error as any)?.message || error)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-3">
          {meds.map((m) => {
            const tone = toneByStatus(m.status);

            return (
              <div
                key={m.id}
                className="rounded-3xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-base md:text-lg font-black text-slate-900 truncate">
                      {m.drugName}
                    </div>

                    <div className="mt-2 text-sm text-slate-600 font-bold flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-2">
                        <i className="fa-solid fa-prescription-bottle-medical text-slate-400" />
                        {m.dose}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <i className="fa-solid fa-route text-slate-400" />
                        {m.route}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <i className="fa-regular fa-calendar-check text-slate-400" />
                        {m.frequency}
                      </span>
                    </div>

                    <div className="mt-3 text-sm font-bold text-slate-500">
                      <i className="fa-solid fa-user-doctor text-slate-400 mr-2" />
                      {m.meta}
                    </div>

                    {m.note ? (
                      <div className="mt-2 text-sm font-bold text-slate-500">
                        <i className="fa-regular fa-note-sticky text-slate-400 mr-2" />
                        {m.note}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-2xl border ${tone}`}>
                      {m.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {meds.length === 0 && (
            <div className="border border-dashed border-slate-200 rounded-3xl p-10 text-center text-slate-400 font-bold">
              Không có đơn thuốc trong lần khám này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
