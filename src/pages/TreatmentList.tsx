import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { RoomGrid } from "@/components/RoomSection";
import { getBuongPhong } from "@/services/dibuong.api";
import type { BuongPhongResponse } from "@/types/dibuong";

// TODO: nếu có API danh sách khoa thì thay mảng này bằng data query
const KHOA_OPTIONS = [
  { id: "41CA5C91-F449-404F-B37B-00EFE98B8375", name: "Khoa (demo)" },
  // { id: "...", name: "Khoa Nội" },
  // { id: "...", name: "Khoa Sản" },
];

export const TreatmentList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [idKhoa, setIdKhoa] = useState<string>(KHOA_OPTIONS[0].id);

  const { data, isLoading, error } = useQuery<BuongPhongResponse>({
    queryKey: ["buongphong", idKhoa],
    queryFn: () => getBuongPhong(idKhoa),
    enabled: !!idKhoa,
  });

  const wardLayout = useMemo(() => {
    if (!data?.DSPhong) return [];

    return data.DSPhong.map((phong) => ({
      room: phong.Ma,
      beds: phong.DsGiuong.map((giuong) => {
        const benhAn = giuong.DsBenhAn?.[0];
        return {
          code: giuong.MaGiuong,
          patient: benhAn
            ? {
              id: benhAn.IdBenhAn,
              name: benhAn.HoTenBenhNhan,
              code: benhAn.MaBenhNhan,
              room: phong.Ma,
              bed: giuong.MaGiuong,
              maBenhAn: benhAn.MaBenhAn,
              gioiTinh: benhAn.GioiTinh,
              tuoi: benhAn.Tuoi,
              isTyc: giuong.isTyc,
            }
            : undefined,
        };
      }),
    }));
  }, [data]);

  const filteredWard = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return wardLayout;

    return wardLayout.map((room) => ({
      ...room,
      beds: room.beds.map((bed) => {
        if (!bed.patient) return bed;

        const matches =
          (bed.patient.name ?? "").toLowerCase().includes(s) ||
          String(bed.patient.code ?? "").toLowerCase().includes(s);

        return matches ? bed : { ...bed, patient: undefined };
      }),
    }));
  }, [wardLayout, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-40">
        <i className="fa-solid fa-circle-notch fa-spin text-6xl text-primary opacity-20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto p-6 bg-red-50 border border-red-200 text-red-700 font-bold rounded-3xl">
        Lỗi tải dữ liệu: {String((error as any)?.message || error)}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 max-w-[1400px] mx-auto">
      {/* ✅ 1 hàng: chọn khoa + search (rõ + không lỗi arrow) */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Select wrapper để vẽ arrow riêng */}
        <div className="relative md:w-[320px]">
          <select
            value={idKhoa}
            onChange={(e) => setIdKhoa(e.target.value)}
            className="w-full appearance-none px-5 py-4 pr-12 rounded-3xl border-2 border-slate-300 bg-white text-sm font-black text-slate-800 outline-none shadow-sm
                 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
          >
            {KHOA_OPTIONS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>

          {/* Arrow custom */}
          <i className="fa-solid fa-chevron-down pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
        </div>

        {/* Search rõ hơn */}
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm tên bệnh nhân, mã số..."
            className="w-full pl-12 pr-6 py-4 rounded-3xl border-2 border-slate-300 bg-white
                 outline-none font-bold text-sm text-slate-800 shadow-sm
                 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <RoomGrid
        filteredWard={filteredWard}
        searchTerm={searchTerm}
        onBedClick={({ idBenhAn, maBenhNhan, tenBenhNhan }) => {
          if (!idBenhAn) return;

          const qs = new URLSearchParams({
            maBenhNhan: maBenhNhan ?? "",
            tenBenhNhan: tenBenhNhan ?? "",
          }).toString();

          navigate(`/patient/${idBenhAn}?${qs}`);
        }}
      />
    </div>
  );
};