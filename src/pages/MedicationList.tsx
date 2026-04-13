import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

import { MedicationBedCard } from "@/components/MedicationBedCard";
import { buildAdvancedShiftStats } from "@/components/buildAdvancedShiftStats";
import { useAuth } from "@/context/AuthContext";
import { getBuongPhong, getDonThuocByPhieuKham, getDsLanKham } from "@/services/dibuong.api";
import { getMedSplitsByEncounter } from "@/services/medSplit.api";
import type { BuongPhongResponse, DonThuocItem, MedVisitLite } from "@/types/dibuong";
import { ShiftType } from "@/types/dibuong";
import { getCurrentShift, SHIFT_OPTIONS } from "@/utils/shifts";

export const MedicationList: React.FC = () => {
  const { user } = useAuth();

  const khoaOptions = [{ id: user?.idHis || "", name: user?.tenKhoa || "Khoa" }];

  const [searchTerm, setSearchTerm] = useState("");
  const [activeShift, setActiveShift] = useState<ShiftType>(() => getCurrentShift());
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [idKhoa, setIdKhoa] = useState<string>(khoaOptions[0].id);

  const displayDate = useMemo(() => {
    if (!selectedDate) return "--/--/----";
    const date = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return selectedDate;

    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }, [selectedDate]);

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null;
    const date = new Date(`${selectedDate}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [selectedDate]);

  type DateTriggerProps = { value?: string; onClick?: () => void };

  const DateTrigger = React.forwardRef<HTMLButtonElement, DateTriggerProps>(({ onClick }, ref) => (
    <button
      type="button"
      onClick={onClick}
      ref={ref}
      className="w-full flex items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
    >
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-calendar-check text-primary text-sm"></i>
        <span className="text-[10px] font-black text-slate-400 uppercase lg:hidden">Ngay:</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-slate-800 tabular-nums">{displayDate}</span>
        <i className="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
      </div>
    </button>
  ));

  DateTrigger.displayName = "DateTrigger";

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

    return list.sort((a, b) => a.idBenhAn.localeCompare(b.idBenhAn));
  }, [wardData]);

  const { data: lanKhamByBenhAn } = useQuery({
    queryKey: ["lanKham", benhAnIds, selectedDate],
    enabled: benhAnIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        benhAnIds.map(async ({ idBenhAn }) => {
          const list = await getDsLanKham(idBenhAn);
          const matched = list?.find((lk) => lk.NgayThucKham?.startsWith(selectedDate));
          return [idBenhAn, matched?.Id ?? null] as const;
        })
      );

      return Object.fromEntries(entries);
    },
  });

  const phieuKhamIds = useMemo(() => {
    if (!lanKhamByBenhAn) {
      const ids = new Set<string>();

      wardData?.DSPhong?.forEach((phong: any) => {
        phong?.DsGiuong?.forEach((giuong: any) => {
          giuong?.DsBenhAn?.forEach((benhAn: any) => {
            const id = benhAn?.IdPhieuKhamMoiNhat;
            if (id) ids.add(String(id));
          });
        });
      });

      return Array.from(ids).sort();
    }

    return (Object.values(lanKhamByBenhAn).filter(Boolean) as string[]).sort();
  }, [lanKhamByBenhAn, wardData]);

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

  const { data: allSplitsByVisit } = useQuery({
    queryKey: ["allMedSplits", phieuKhamIds],
    enabled: phieuKhamIds.length > 0,
    staleTime: 0,
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

  const shiftsByVisit = useMemo(() => {
    const map: Record<string, ReturnType<typeof buildAdvancedShiftStats>> = {};
    if (!medsByVisit || !allSplitsByVisit) return map;

    Object.keys(medsByVisit).forEach((id) => {
      const meds = medsByVisit[id] ?? [];
      const splits = allSplitsByVisit[id] ?? {};
      map[id] = buildAdvancedShiftStats(meds, splits);
    });

    return map;
  }, [medsByVisit, allSplitsByVisit]);

  const wardLayout = useMemo(() => {
    if (!wardData?.DSPhong) return [];

    return wardData.DSPhong.map((phong: any) => ({
      room: phong.Ma,
      beds: (phong.DsGiuong ?? []).map((giuong: any) => {
        const bedCode = giuong?.MaGiuong ?? "--";

        const visits: MedVisitLite[] = (giuong.DsBenhAn ?? []).map((benhAn: any) => {
          const idBenhAn = String(benhAn.IdBenhAn);
          const idPhieuKham = lanKhamByBenhAn?.[idBenhAn] ?? String(benhAn?.IdPhieuKhamMoiNhat);
          const meds = medsByVisit?.[idPhieuKham] ?? [];
          const shifts =
            shiftsByVisit[idPhieuKham] ?? buildAdvancedShiftStats(meds, allSplitsByVisit?.[idPhieuKham] ?? {});

          return {
            id: String(benhAn.IdBenhAn),
            patientName: benhAn.HoTenBenhNhan,
            patientCode: benhAn.MaBenhNhan,
            patientGender: benhAn.GioiTinh,
            patientAge: benhAn.Tuoi,
            room: String(phong.Ma),
            bed: String(bedCode),
            idPhieuKham,
            marSummary: { shifts },
          };
        });

        return {
          code: bedCode,
          visits,
          isOccupied: visits.length > 0,
        };
      }),
    }));
  }, [allSplitsByVisit, lanKhamByBenhAn, medsByVisit, shiftsByVisit, wardData]);

  const totalByShift = useMemo(() => {
    const result: Record<string, number> = {};

    wardLayout.forEach((room) => {
      room.beds.forEach((bed) => {
        bed.visits.forEach((visit) => {
          const shifts = visit.marSummary?.shifts || {};
          Object.keys(shifts).forEach((shiftId) => {
            const total = shifts[shiftId]?.total ?? 0;
            result[shiftId] = (result[shiftId] || 0) + total;
          });
        });
      });
    });

    return result;
  }, [wardLayout]);

  const filteredWard = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return wardLayout;

    return wardLayout.map((room) => ({
      ...room,
      beds: room.beds.map((bed) => {
        const matchingVisits = bed.visits.filter(
          (visit) =>
            (visit.patientName ?? "").toLowerCase().includes(normalized) ||
            String(visit.patientCode ?? "").toLowerCase().includes(normalized)
        );

        return {
          ...bed,
          visits: matchingVisits,
          isOccupied: matchingVisits.length > 0,
        };
      }),
    }));
  }, [searchTerm, wardLayout]);

  const isClosed = false;
  const isLoading = isLoadingWard || (phieuKhamIds.length > 0 && isLoadingMeds);
  const error = wardError || medsError;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-500 text-sm animate-pulse">Vui long cho giay lat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1300px] mx-auto p-6 bg-red-50 border border-red-200 text-red-700 font-bold rounded-3xl">
        Loi tai du lieu: {String((error as any)?.message || error)}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-24 px-3 md:px-6 max-w-[1300px] mx-auto">
      <div className="bg-white p-4 md:p-6 rounded-[28px] md:rounded-[36px] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-primary text-white rounded-[20px] md:rounded-[24px] flex items-center justify-center text-xl md:text-3xl shadow-xl shadow-primary/20 transform -rotate-2">
            <i className="fa-solid fa-pills"></i>
          </div>

          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 uppercase leading-none mb-1 tracking-tighter">
              Thực hiện thuốc
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5 font-bold bg-blue-50 text-primary px-2 md:px-3 py-1 rounded-full">
                <i className="fa-solid fa-hospital"></i>
                <select
                  value={idKhoa}
                  onChange={(e) => setIdKhoa(e.target.value)}
                  className="bg-transparent outline-none font-black"
                >
                  {khoaOptions.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
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
          <div className="relative w-full lg:w-[240px]">
            <DatePicker
              selected={selectedDateObj}
              onChange={(date) => {
                if (!date) return;
                setSelectedDate(format(date, "yyyy-MM-dd"));
              }}
              dateFormat="dd/MM/yyyy"
              customInput={<DateTrigger />}
              calendarClassName="rdp-calendar"
              popperClassName="rdp-popper"
              popperPlacement="bottom-start"
              showPopperArrow={false}
              fixedHeight
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="bg-slate-200/30 p-1.5 rounded-2xl flex gap-1.5 shadow-inner min-w-[400px] md:min-w-0 md:max-w-5xl md:mx-auto">
          {SHIFT_OPTIONS.map((option) => {
            const totalInShift = totalByShift[option.id] ?? 0;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveShift(option.id)}
                title={`${option.label} (${option.timeRange})`}
                className={`flex-1 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl transition-all flex flex-col items-center justify-center relative ${
                  activeShift === option.id ? "bg-white text-primary shadow-sm" : "text-slate-500"
                }`}
              >
                {totalInShift > 0 && (
                  <span className="absolute top-1 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                )}
                <div className="flex items-center gap-1.5 md:gap-2">
                  <i className={`fa-solid ${option.icon} text-[10px] md:text-[12px]`} />
                  <span className="text-[9px] md:text-[11px] font-extrabold uppercase">{option.label}</span>
                </div>
                <span className="text-[8px] font-bold opacity-60 italic">({totalInShift})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-start">
        <div className="relative w-full md:w-96 group">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors"></i>
          <input
            type="text"
            placeholder="Tìm tên bệnh nhân hoặc mã bệnh nhân..."
            className="w-full pl-12 pr-6 py-4 rounded-3xl border-2 border-slate-200 bg-white text-slate-900 font-black text-sm placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
        {filteredWard.map((room) => (
          <section key={room.room} className="space-y-4">
            <div className="flex items-center gap-3 md:gap-4 px-2 md:px-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-[14px] md:rounded-[18px] flex items-center justify-center font-black text-lg md:text-xl shadow-lg border-2 border-white transform rotate-3">
                {String(room.room).replace(/\D/g, "") || "--"}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-base md:text-xl text-slate-800 uppercase tracking-tight">Phong {room.room}</h3>
              </div>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {room.beds.map((bed, idx) => (
                <MedicationBedCard
                  key={`${room.room}-${bed.code}-${idx}`}
                  bedCode={bed.code}
                  visits={bed.visits}
                  activeShift={activeShift}
                  isClosed={isClosed}
                  highlightSearch={!!searchTerm && bed.visits.length > 0}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
