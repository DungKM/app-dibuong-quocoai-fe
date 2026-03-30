import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getBuongPhong, getDonThuocByPhieuKham, getDsLanKham } from "@/services/dibuong.api";
import { BuongPhongResponse, DonThuocItem, MedVisitLite, ShiftType } from "@/types/dibuong";
import { MedicationBedCard } from "@/components/MedicationBedCard";
import { getMedSplitsByEncounter } from "@/services/medSplit.api";
import { buildAdvancedShiftStats } from "@/components/buildAdvancedShiftStats";
import { useAuth } from "@/context/AuthContext";


export const MedicationList: React.FC = () => {
  const { user, logout } = useAuth();

  const KHOA_OPTIONS = [
    { id: user?.idHis || "", name: user?.tenKhoa || "Khoa" },
  ];
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

  const benhAnIds = useMemo(() => {
    const list: { idBenhAn: string }[] = [];
    wardData?.DSPhong?.forEach((phong: any) => {
      phong?.DsGiuong?.forEach((giuong: any) => {
        giuong?.DsBenhAn?.forEach((benhAn: any) => {
          if (benhAn?.IdBenhAn) {
            list.push({ idBenhAn: String(benhAn.IdBenhAn) });
          }
        });
      });
    });
    return list;
  }, [wardData]);

  const { data: lanKhamByBenhAn } = useQuery({
    queryKey: ["lanKham", benhAnIds, selectedDate],
    enabled: benhAnIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        benhAnIds.map(async ({ idBenhAn }) => {
          const list = await getDsLanKham(idBenhAn);
          // Filter theo ngày đã chọn
          const matched = list?.find((lk) =>
            lk.NgayThucKham?.startsWith(selectedDate)
          );
          return [idBenhAn, matched?.Id ?? null] as const;
        })
      );
      return Object.fromEntries(entries);
    },
  });


  /** 2) Gom list idPhieuKham để call thuốc */
  const phieuKhamIds = useMemo(() => {
    if (!lanKhamByBenhAn) {
      // Fallback về IdPhieuKhamMoiNhat khi chưa load xong
      const set = new Set<string>();
      wardData?.DSPhong?.forEach((phong: any) => {
        phong?.DsGiuong?.forEach((giuong: any) => {
          giuong?.DsBenhAn?.forEach((benhAn: any) => {
            const id = benhAn?.IdPhieuKhamMoiNhat;
            if (id) set.add(String(id));
          });
        });
      });
      return Array.from(set);
    }

    // Lấy các idPhieuKham có giá trị (không null)
    return Object.values(lanKhamByBenhAn).filter(Boolean) as string[];
  }, [lanKhamByBenhAn, wardData]);

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
  const { data: allSplitsByVisit } = useQuery({
    queryKey: ["allMedSplits", phieuKhamIds],
    enabled: phieuKhamIds.length > 0,
    staleTime: 0, // 👈 thêm dòng này
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
        const bedCode = giuong?.MaGiuong ?? "--";

        const visits: MedVisitLite[] = (giuong.DsBenhAn ?? []).map((benhAn: any) => {
          const idBenhAn = String(benhAn.IdBenhAn);
          const idPK = lanKhamByBenhAn?.[idBenhAn]
            ?? String(benhAn?.IdPhieuKhamMoiNhat);
          const meds = medsByVisit?.[idPK] ?? [];
          const splits = allSplitsByVisit?.[idPK] ?? {};
          const shifts = buildAdvancedShiftStats(meds, splits);

          return {
            id: String(benhAn.IdBenhAn),
            patientName: benhAn.HoTenBenhNhan,
            patientCode: benhAn.MaBenhNhan,
            patientGender: benhAn.GioiTinh,
            patientAge: benhAn.Tuoi,
            room: String(phong.Ma),
            bed: String(bedCode),
            idPhieuKham: idPK,
            marSummary: { shifts },
          };
        });

        return {
          code: bedCode,
          visits,
          isOccupied: visits.length > 0
        };
      }),
    }));
  }, [wardData, medsByVisit, allSplitsByVisit]);
  const isClosed = false;
  const isLoading = isLoadingWard || (phieuKhamIds.length > 0 && isLoadingMeds);
  const error = wardError || medsError;


  return (
    <div className="space-y-4 md:space-y-6 pb-24 px-3 md:px-6 max-w-[1300px] mx-auto">
      {/* Dashboard Header: Chuyển thành 1 cột trên mobile */}
      <div className="bg-white p-4 md:p-6 rounded-[28px] md:rounded-[36px] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-primary text-white rounded-[20px] md:rounded-[24px] flex items-center justify-center text-xl md:text-3xl shadow-xl shadow-primary/20 transform -rotate-2">
            <i className="fa-solid fa-pills"></i>
          </div>

          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 uppercase leading-none mb-1 tracking-tighter">
              Thực hiện thuốc
              {isClosed && (
                <span className="ml-2 bg-red-600 text-white text-[7px] px-2 py-0.5 rounded-full uppercase font-black align-middle shadow-md animate-pulse">
                  Đã chốt
                </span>
              )}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5 font-bold bg-blue-50 text-primary px-2 md:px-3 py-1 rounded-full">
                <i className="fa-solid fa-hospital"></i>
                <select
                  value={idKhoa}
                  onChange={(e) => setIdKhoa(e.target.value)}
                  className="bg-transparent outline-none font-black"
                >
                  {KHOA_OPTIONS.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </span>
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved"></i> 5 đúng
              </span>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-auto">
          <div className="flex items-center justify-between lg:justify-start gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 shadow-inner">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-calendar-check text-primary text-sm"></i>
              <span className="text-[10px] font-black text-slate-400 uppercase lg:hidden">Ngày:</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-black border-none focus:ring-0 text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Tabs ca: Cho phép cuộn ngang trên mobile nếu quá dài */}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="bg-slate-200/30 p-1.5 rounded-2xl flex gap-1.5 shadow-inner min-w-[400px] md:min-w-0 md:max-w-5xl md:mx-auto">
          {[
            { id: ShiftType.MORNING, label: "Sáng", icon: "fa-sun" },
            { id: ShiftType.NOON, label: "Trưa", icon: "fa-cloud-sun" },
            { id: ShiftType.AFTERNOON, label: "Chiều", icon: "fa-cloud" },
            { id: ShiftType.NIGHT, label: "Tối", icon: "fa-moon" },
          ].map((s) => {
            const totalInShift = wardLayout.reduce((acc, room) => {
              return acc + room.beds.reduce((accBed, bed) => {
                const bedTotal = bed.visits.reduce((accVisit, v) =>
                  accVisit + (v.marSummary?.shifts?.[s.id]?.total ?? 0), 0);
                return accBed + bedTotal;
              }, 0);
            }, 0);

            return (
              <button
                key={s.id}
                onClick={() => setActiveShift(s.id)}
                className={`flex-1 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl transition-all flex flex-col items-center justify-center relative
                ${activeShift === s.id ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}
              >
                {totalInShift > 0 && (
                  <span className="absolute top-1 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                )}
                <div className="flex items-center gap-1.5 md:gap-2">
                  <i className={`fa-solid ${s.icon} text-[10px] md:text-[12px]`} />
                  <span className="text-[9px] md:text-[11px] font-extrabold uppercase">{s.label}</span>
                </div>
                <span className="text-[8px] font-bold opacity-60 italic">({totalInShift})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Phòng và Giường: Tự động đổi số cột */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
        {wardLayout.map((room) => (
          <section key={room.room} className="space-y-4">
            <div className="flex items-center gap-3 md:gap-4 px-2 md:px-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-[14px] md:rounded-[18px] flex items-center justify-center font-black text-lg md:text-xl shadow-lg border-2 border-white transform rotate-3">
                {String(room.room).replace(/\D/g, "") || "--"}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-base md:text-xl text-slate-800 uppercase tracking-tight">Phòng {room.room}</h3>
              </div>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            {/* Giường: 1 cột trên mobile, 2 cột trên tablet trở lên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {room.beds.map((bed, idx) => (
                <MedicationBedCard
                  key={`${room.room}-${bed.code}-${idx}`}
                  bedCode={bed.code}
                  visits={bed.visits}
                  activeShift={activeShift}
                  isClosed={isClosed}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};