import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getBuongPhong, getDonThuocByPhieuKham } from "@/services/dibuong.api";
import { BuongPhongResponse, DonThuocItem, MedVisitLite, ShiftType } from "@/types/dibuong";
import { MedicationBedCard } from "@/components/MedicationBedCard";
import { buildAllShiftStats } from "@/components/buildAllShiftStats";
import { getMedSplitsByEncounter } from "@/services/medSplit.api";
import { buildAdvancedShiftStats } from "@/components/buildAdvancedShiftStats";

const KHOA_OPTIONS = [
  { id: "41CA5C91-F449-404F-B37B-00EFE98B8375", name: "Khoa Nhi" },
];

export const MedicationList: React.FC = () => {
  const [activeShift, setActiveShift] = useState<ShiftType>(ShiftType.MORNING);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [idKhoa, setIdKhoa] = useState<string>(KHOA_OPTIONS[0].id);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) setActiveShift(ShiftType.MORNING);
    else if (hour >= 12 && hour < 14) setActiveShift(ShiftType.NOON);
    else if (hour >= 14 && hour < 18) setActiveShift(ShiftType.AFTERNOON);
    else setActiveShift(ShiftType.NIGHT);
  }, []);

  /** 1) Lấy buồng/giường */
  const {
    data: wardData,
    isLoading: isLoadingWard,
    error: wardError,
  } = useQuery<BuongPhongResponse>({
    queryKey: ["buongphong", idKhoa],
    queryFn: () => getBuongPhong(idKhoa),
    enabled: !!idKhoa,
  });

  /** 2) Gom list idPhieuKham để call thuốc */
  const phieuKhamIds = useMemo(() => {
    const set = new Set<string>();
    wardData?.DSPhong?.forEach((phong: any) => {
      phong?.DsGiuong?.forEach((giuong: any) => {
        const benhAn = giuong?.DsBenhAn?.[0];
        const idPhieuKham = benhAn?.IdPhieuKhamMoiNhat;
        if (idPhieuKham) set.add(String(idPhieuKham));
      });
    });
    return Array.from(set);
  }, [wardData]);

  // console.log(phieuKhamIds);
  /** 3) Fetch thuốc theo từng idPhieuKham */
  const {
    data: medsByVisit,
    isLoading: isLoadingMeds,
    error: medsError,
  } = useQuery<Record<string, DonThuocItem[]>>({
    queryKey: ["medsByVisit", phieuKhamIds, selectedDate],
    enabled: phieuKhamIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        phieuKhamIds.map(async (id) => {
          const meds = await getDonThuocByPhieuKham(id);
          return [id, meds] as const;
        })
      );
      return Object.fromEntries(entries);
    },
  });
  /** 4) Fetch toàn bộ dữ liệu thực tế (MedShiftSplit) của các idPhieuKham */
  const { data: allSplitsByVisit, isLoading: isLoadingSplits } = useQuery({
    queryKey: ["allMedSplits", phieuKhamIds],
    enabled: phieuKhamIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        phieuKhamIds.map(async (id) => {
          const res = await getMedSplitsByEncounter(id);
          return [id, res.splits] as const;
        })
      );
      return Object.fromEntries(entries);
    },
  });

  const wardLayout = useMemo(() => {
    if (!wardData?.DSPhong) return [];

    return wardData.DSPhong.map((phong: any) => ({
      room: phong.Ma,
      beds: (phong.DsGiuong ?? []).map((giuong: any) => {
        const benhAn = giuong?.DsBenhAn?.[0];
        const bedCode = giuong?.MaGiuong ?? "--";

        if (!benhAn) return { code: bedCode, visit: undefined };

        const idPhieuKham = String(benhAn?.IdPhieuKhamMoiNhat);
        const meds = medsByVisit?.[idPhieuKham] ?? [];
        const splits = allSplitsByVisit?.[idPhieuKham] ?? {}; // Dữ liệu thực tế (status, returnHistory...)

        // ✅ CẬP NHẬT LOGIC TÍNH STATS: Kết hợp đơn gốc + dữ liệu thực tế
        const shifts = buildAdvancedShiftStats(meds, splits, selectedDate);

        const visit: MedVisitLite = {
          id: String(benhAn.IdBenhAn),
          patientName: benhAn.HoTenBenhNhan,
          patientCode: benhAn.MaBenhNhan,
          patientGender: benhAn.GioiTinh,
          room: String(phong.Ma),
          bed: String(bedCode),
          idPhieuKham,
          marSummary: { shifts },
        };

        return { code: bedCode, visit };
      }),
    }));
  }, [wardData, medsByVisit, allSplitsByVisit, selectedDate]);
  /** Nếu bạn chưa có API "chốt ca", tạm để false */
  const isClosed = false;

  const isLoading = isLoadingWard || (phieuKhamIds.length > 0 && isLoadingMeds);
  const error = wardError || medsError;

  return (
    <div className="space-y-6 pb-24 max-w-[1300px] mx-auto">
      {/* Dashboard Header */}
      <div className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center text-3xl shadow-xl shadow-primary/20 transform -rotate-2">
            <i className="fa-solid fa-pills"></i>
          </div>

          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase leading-none mb-1 tracking-tighter">
              Thực hiện dùng thuốc
              {isClosed && (
                <span className="ml-3 bg-red-600 text-white text-[8px] px-2 py-1 rounded-full uppercase font-black align-middle tracking-widest shadow-md animate-pulse">
                  <i className="fa-solid fa-lock mr-1"></i>Đã chốt
                </span>
              )}
            </h1>

            <div className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              {/* Khoa */}
              <span className="flex items-center gap-1.5 font-bold bg-blue-50 text-primary px-3 py-1 rounded-full">
                <i className="fa-solid fa-hospital"></i>{" "}
                <select
                  value={idKhoa}
                  onChange={(e) => setIdKhoa(e.target.value)}
                  className="bg-transparent outline-none font-black"
                >
                  {KHOA_OPTIONS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </span>

              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved"></i> Giám sát 5 đúng
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 shadow-inner">
            <i className="fa-solid fa-calendar-check text-primary text-sm"></i>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-black border-none focus:ring-0 text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Tabs ca */}
      <div className="bg-slate-200/30 p-2 rounded-2xl flex gap-2 shadow-inner w-full max-w-5xl mx-auto">
        {[
          { id: ShiftType.MORNING, label: "Sáng", icon: "fa-sun" },
          { id: ShiftType.NOON, label: "Trưa", icon: "fa-cloud-sun" },
          { id: ShiftType.AFTERNOON, label: "Chiều", icon: "fa-cloud" },
          { id: ShiftType.NIGHT, label: "Tối", icon: "fa-moon" },
        ].map((s) => {
          const totalInShift = wardLayout.reduce((acc, room) => {
            return acc + room.beds.reduce((accBed, bed) => {
              return accBed + (bed.visit?.marSummary?.shifts?.[s.id]?.total ?? 0);
            }, 0);
          }, 0);

          return (
            <button
              key={s.id}
              onClick={() => setActiveShift(s.id)}
              className={`flex-1 py-3.5 rounded-2xl transition-all flex flex-col items-center justify-center relative
        ${activeShift === s.id ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}
            >
              {totalInShift > 0 && (
                <span className="absolute top-2 right-4 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
              <div className="flex items-center gap-2">
                <i className={`fa-solid ${s.icon} text-[12px]`} />
                <span className="text-[11px] font-extrabold uppercase">{s.label}</span>
              </div>
              <span className="text-[9px] font-bold opacity-60 italic">({totalInShift} thuốc)</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-40">
          <i className="fa-solid fa-circle-notch fa-spin text-5xl text-primary opacity-20"></i>
        </div>
      ) : error ? (
        <div className="max-w-[1300px] mx-auto p-6 bg-red-50 border border-red-200 text-red-700 font-bold rounded-3xl">
          Lỗi tải dữ liệu: {String((error as any)?.message || error)}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {wardLayout.map((room) => (
            <section key={room.room} className="space-y-4">
              <div className="flex items-center gap-4 px-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-[18px] flex items-center justify-center font-black text-xl shadow-lg border-2 border-white transform rotate-3">
                  {String(room.room).replace(/\D/g, "") || "--"}
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Phòng {room.room}</h3>
                </div>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {room.beds.map((bed, idx) => (
                  <MedicationBedCard
                    key={`${room.room}-${bed.code}-${idx}`}
                    bedCode={bed.code}
                    visit={bed.visit}
                    activeShift={activeShift}
                    isClosed={isClosed}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {!isLoading && !error && phieuKhamIds.length === 0 ? (
        <div className="max-w-[1300px] mx-auto p-5 bg-amber-50 border border-amber-200 text-amber-800 font-bold rounded-3xl">
          ⚠️ Không tìm thấy <b>IdPhieuKham / IdLanKham / VisitId</b> trong DsBenhAn nên chưa thể gọi{" "}
          <b>getDonThuocByPhieuKham()</b> để tính số thuốc theo ca.
        </div>
      ) : null}
    </div>
  );
};