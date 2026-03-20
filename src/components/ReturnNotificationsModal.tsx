import React, { useEffect, useMemo, useState } from "react";
import { env } from "@/config/env";
import { authStorage } from "@/services/auth.api";

type ReturnItem = {
  id: string;
  idPhieuKham: string | null;
  idPhieuThuoc: string | null;
  tenThuoc: string;
  quantity: number;
  reason: string;
  returnedAt: string;
  url?: string | null;
};

type ReturnPatient = {
  maBenhNhan: string;
  tenBenhNhan: string;
  lastReturnedAt: string;
  returnCount: number;
  items: ReturnItem[];
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatDateInput(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildHashUrl(rawUrl?: string | null) {
  if (!rawUrl) return "";
  let to = rawUrl;
  const hashIndex = to.indexOf("#");
  to = hashIndex !== -1 ? to.slice(hashIndex + 1) : to;
  if (!to.startsWith("/")) to = "/" + to;
  return `/#${to}`;
}

export const ReturnNotificationsModal: React.FC<Props> = ({ open, onClose }) => {
  const [date, setDate] = useState(formatDateInput());
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<ReturnPatient[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [keyword, setKeyword] = useState("");
  const [summary, setSummary] = useState({
    totalPatients: 0,
    totalReturns: 0,
    totalQty: 0,
  });

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${env.API_BACKEND_AUTH_NODE_URL}/api/notifications/returns-by-date?date=${date}`,
          {
            headers: {
              Authorization: `Bearer ${authStorage.getAccessToken()}`,
            },
          }
        );

        const json = await res.json();
        setPatients(json.patients || []);
        setSummary(
          json.summary || {
            totalPatients: 0,
            totalReturns: 0,
            totalQty: 0,
          }
        );

        const first = (json.patients || [])[0];
        setSelectedKey(first ? `${first.maBenhNhan}__${first.tenBenhNhan}` : "");
      } catch (e) {
        console.log("Load return notifications error:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, date]);

  const filteredPatients = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return patients;

    return patients.filter(
      (p) =>
        p.tenBenhNhan.toLowerCase().includes(q) ||
        p.maBenhNhan.toLowerCase().includes(q)
    );
  }, [patients, keyword]);

  const selectedPatient = filteredPatients.find(
    (p) => `${p.maBenhNhan}__${p.tenBenhNhan}` === selectedKey
  );

  const goToProfile = (rawUrl?: string | null) => {
    const finalUrl = buildHashUrl(rawUrl);
    if (!finalUrl) return;
    onClose();
    window.location.href = finalUrl;
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="w-full md:max-w-6xl h-[92vh] md:h-[85vh] bg-white md:rounded-[32px] rounded-t-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900">
                Danh sách trả thuốc
              </h2>
              <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                Theo bệnh nhân trong ngày
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 md:px-4 py-3 rounded-2xl border border-slate-200 font-bold text-sm w-full"
              />
              <button
                onClick={() => setDate(formatDateInput())}
                className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs uppercase whitespace-nowrap"
              >
                Hôm nay
              </button>
            </div>

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm tên bệnh nhân / mã BN"
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium"
            />

            <div className="grid grid-cols-3 gap-2 md:flex md:gap-3">
              <div className="px-3 py-3 rounded-2xl bg-sky-50 text-sky-700">
                <div className="text-[9px] md:text-[10px] font-black uppercase">BN</div>
                <div className="text-base md:text-lg font-black">{summary.totalPatients}</div>
              </div>
              <div className="px-3 py-3 rounded-2xl bg-amber-50 text-amber-700">
                <div className="text-[9px] md:text-[10px] font-black uppercase">Lượt</div>
                <div className="text-base md:text-lg font-black">{summary.totalReturns}</div>
              </div>
              <div className="px-3 py-3 rounded-2xl bg-emerald-50 text-emerald-700">
                <div className="text-[9px] md:text-[10px] font-black uppercase">SL trả</div>
                <div className="text-base md:text-lg font-black">{summary.totalQty}</div>
              </div>
            </div>
          </div>

          {/* MOBILE */}
          <div className="flex-1 min-h-0 md:hidden overflow-hidden">
            {!selectedPatient ? (
              <div className="h-full overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="p-6 text-slate-400 font-bold">Đang tải...</div>
                ) : filteredPatients.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold">
                    Không có bệnh nhân trả thuốc
                  </div>
                ) : (
                  filteredPatients.map((p) => {
                    const key = `${p.maBenhNhan}__${p.tenBenhNhan}`;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedKey(key)}
                        className="w-full text-left p-4 rounded-[24px] border bg-white border-slate-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 uppercase break-words">
                              {p.tenBenhNhan}
                            </p>
                            <p className="text-xs text-slate-400 font-bold mt-1">
                              #{p.maBenhNhan}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black whitespace-nowrap">
                            {p.returnCount} lượt
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500 font-medium">
                          Gần nhất: {new Date(p.lastReturnedAt).toLocaleString("vi-VN")}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setSelectedKey("")}
                    className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600"
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase">
                      {selectedPatient.tenBenhNhan}
                    </p>
                    <p className="text-xs text-slate-400 font-bold">
                      #{selectedPatient.maBenhNhan}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedPatient.items.map((item, idx) => (
                    <div
                      key={`${item.idPhieuThuoc}-${idx}`}
                      className="bg-white rounded-[24px] border border-slate-200 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-black text-slate-900 break-words">
                            {item.tenThuoc}
                          </p>
                          <p className="text-sm text-slate-500 font-medium mt-1 break-words">
                            Lý do: {item.reason || "Không có"}
                          </p>
                        </div>
                        <span className="px-3 py-2 rounded-2xl bg-rose-50 text-rose-600 font-black text-xs whitespace-nowrap">
                          Trả {item.quantity}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 text-xs text-slate-400 font-bold">
                        <span>{new Date(item.returnedAt).toLocaleString("vi-VN")}</span>
                        {item.url && (
                          <button
                            onClick={() => goToProfile(item.url)}
                            className="text-primary text-left"
                          >
                            Mở hồ sơ
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP */}
          <div className="hidden md:grid flex-1 min-h-0 grid-cols-12">
            <div className="col-span-4 border-r border-slate-100 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-slate-400 font-bold">Đang tải...</div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold">
                  Không có bệnh nhân trả thuốc
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {filteredPatients.map((p) => {
                    const key = `${p.maBenhNhan}__${p.tenBenhNhan}`;
                    const active = selectedKey === key;

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedKey(key)}
                        className={`w-full text-left p-4 rounded-[24px] border transition ${
                          active
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 uppercase break-words">
                              {p.tenBenhNhan}
                            </p>
                            <p className="text-xs text-slate-400 font-bold mt-1">
                              #{p.maBenhNhan}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black">
                            {p.returnCount} lượt
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500 font-medium">
                          Gần nhất: {new Date(p.lastReturnedAt).toLocaleString("vi-VN")}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="col-span-8 overflow-y-auto bg-slate-50/50">
              {!selectedPatient ? (
                <div className="h-full flex items-center justify-center text-slate-400 font-bold">
                  Chọn một bệnh nhân để xem chi tiết
                </div>
              ) : (
                <div className="p-6">
                  <div className="bg-white rounded-[28px] border border-slate-200 p-5 mb-4">
                    <h3 className="text-xl font-black text-slate-900 uppercase">
                      {selectedPatient.tenBenhNhan}
                    </h3>
                    <p className="text-sm text-slate-500 font-bold mt-1">
                      Mã BN: {selectedPatient.maBenhNhan}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {selectedPatient.items.map((item, idx) => (
                      <div
                        key={`${item.idPhieuThuoc}-${idx}`}
                        className="bg-white rounded-[28px] border border-slate-200 p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-lg font-black text-slate-900 break-words">
                              {item.tenThuoc}
                            </p>
                            <p className="text-sm text-slate-500 font-medium mt-1 break-words">
                              Lý do: {item.reason || "Không có"}
                            </p>
                          </div>
                          <span className="px-3 py-2 rounded-2xl bg-rose-50 text-rose-600 font-black text-sm whitespace-nowrap">
                            Trả {item.quantity}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-bold">
                          <span>{new Date(item.returnedAt).toLocaleString("vi-VN")}</span>
                          {item.url && (
                            <button
                              onClick={() => goToProfile(item.url)}
                              className="text-primary"
                            >
                              Mở hồ sơ
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};