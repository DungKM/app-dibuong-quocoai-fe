import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTongHopLinh } from "@/services/dibuong.api";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/services/auth.api";
import type { TongHopLinhItem, TongHopLinhThuocItem } from "@/types/dibuong";

type Row = {
  key: string;
  MaThuoc: string;
  TenThuoc: string;
  DonVi: string | null;
  SoLuong: number;
  IdBenhAn: string;
};

function sumByKey(items: TongHopLinhThuocItem[]) {
  const map = new Map<string, Row>();

  items.forEach((it) => {
    const key = `${it.MaThuoc}__${it.TenThuoc}__${it.DonVi ?? ""}`;
    const cur = map.get(key);

    if (!cur) {
      map.set(key, {
        key,
        MaThuoc: it.MaThuoc,
        TenThuoc: it.TenThuoc,
        DonVi: it.DonVi,
        SoLuong: Number(it.SoLuong || 0),
        IdBenhAn: it.IdBenhAn,
      });
    } else {
      cur.SoLuong += Number(it.SoLuong || 0);
    }
  });

  return Array.from(map.values());
}

export const RxInbox: React.FC = () => {
  const { user } = useAuth();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [qPatient, setQPatient] = useState("");
  const [qDrug, setQDrug] = useState("");

  const { data: departmentHisId } = useQuery<string | null>({
    queryKey: ["department-id-his", user?.idKhoa],
    queryFn: () => authApi.getDepartmentHisById(user!.idKhoa!),
    enabled: !!user?.idKhoa,
  });

  const ID_KHOA = departmentHisId || user?.idHis || "";

  const { data, isLoading, error } = useQuery<TongHopLinhItem[]>({
    queryKey: ["tonghoplinh", ID_KHOA],
    queryFn: () => getTongHopLinh(ID_KHOA),
    enabled: !!ID_KHOA,
  });

  const patients = useMemo(() => {
    const list = data ?? [];
    const s = qPatient.trim().toLowerCase();
    if (!s) return list;

    return list.filter((p) => {
      const hay = `${p.TenBenhNhan} ${p.MaBenhNhan}`.toLowerCase();
      return hay.includes(s);
    });
  }, [data, qPatient]);

  const selectedItem = useMemo(() => {
    const list = data ?? [];
    return list.find((p) => p.IdBenhNhan === selectedPatientId) ?? null;
  }, [data, selectedPatientId]);

  const drugRows = useMemo(() => {
    const items = selectedItem?.DsDonThuoc ?? [];
    const rows = sumByKey(items);

    const s = qDrug.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) => {
      const hay = `${r.MaThuoc} ${r.TenThuoc} ${r.DonVi ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [selectedItem, qDrug]);

  // auto select người đầu tiên sau khi load (đỡ trống)
  React.useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].IdBenhNhan);
    }
  }, [patients, selectedPatientId]);

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6">
      {/* Left: patient list */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800"> Đơn thuốc chờ cấp</h2>

          <div className="mt-3 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <i className="fa-solid fa-magnifying-glass text-slate-400 text-sm" />
            <input
              value={qPatient}
              onChange={(e) => setQPatient(e.target.value)}
              className="bg-transparent outline-none w-full text-sm font-bold text-slate-700 placeholder:text-slate-400"
              placeholder="Tìm theo tên / mã BN..."
            />
            <span className="text-xs font-black text-slate-400">
              {patients.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400">Đang tải...</div>
          ) : error ? (
            <div className="p-4 text-red-600 font-bold">
              Lỗi: {String((error as any)?.message || error)}
            </div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center">
              <i className="fa-solid fa-inbox text-4xl mb-3 text-slate-200" />
              <p>Không có dữ liệu.</p>
            </div>
          ) : (
            patients.map((p) => (
              <div
                key={p.IdBenhNhan}
                onClick={() => setSelectedPatientId(p.IdBenhNhan)}
                className={[
                  "p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition relative",
                  selectedPatientId === p.IdBenhNhan
                    ? "bg-blue-50 border-l-4 border-l-primary"
                    : "border-l-4 border-l-transparent",
                ].join(" ")}
              >
                <div className="font-bold text-slate-800">{p.TenBenhNhan}</div>
                <div className="text-xs text-slate-500">{p.MaBenhNhan}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {p.DsDonThuoc?.length ?? 0} loại thuốc/vt
                </div>
              </div>
              // số lượng loại thuốc
            ))
          )}
        </div>
      </div>

      {/* Right: drug list */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {!selectedItem ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <i className="fa-solid fa-file-prescription text-5xl mb-4 text-slate-200" />
            <p>Chọn bệnh nhân để xem danh sách lĩnh</p>
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {selectedItem.TenBenhNhan}
                  <span className="bg-white text-slate-500 text-xs px-2 py-1 rounded border border-slate-200">
                    {selectedItem.MaBenhNhan}
                  </span>
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Danh sách thuốc/vật tư cần lĩnh (đã gộp trùng)
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-[420px]">
                <i className="fa-solid fa-magnifying-glass text-slate-400 text-sm" />
                <input
                  value={qDrug}
                  onChange={(e) => setQDrug(e.target.value)}
                  className="bg-transparent outline-none w-full text-sm font-bold text-slate-700 placeholder:text-slate-400"
                  placeholder="Tìm theo mã / tên thuốc..."
                />
                <span className="text-xs font-black text-slate-400">
                  {drugRows.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
              <div className="hidden md:grid grid-cols-12 gap-4 mb-2 px-4 text-xs font-bold text-slate-500 uppercase">
                <div className="col-span-3">Mã</div>
                <div className="col-span-5">Tên thuốc / vật tư</div>
                <div className="col-span-2">Đơn vị</div>
                <div className="col-span-2 text-right">Số lượng</div>
              </div>

              {drugRows.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-3xl p-10 text-center text-slate-400 font-bold bg-white">
                  Không có thuốc/vật tư.
                </div>
              ) : (
                <div className="space-y-3">
                  {drugRows.map((r) => (
                    <div
                      key={r.key}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-3">
                          <span className="px-2 py-1 rounded text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-700 font-mono">
                            {r.MaThuoc}
                          </span>
                        </div>

                        <div className="md:col-span-5">
                          <div className="font-bold text-slate-900 text-lg md:text-base">
                            {r.TenThuoc}
                          </div>
                        </div>

                        <div className="md:col-span-2 text-sm font-bold text-slate-700">
                          {r.DonVi ?? "--"}
                        </div>

                        <div className="md:col-span-2 text-right text-lg md:text-base font-black text-slate-900">
                          {r.SoLuong}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
