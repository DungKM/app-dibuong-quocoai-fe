import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { SHIFT_OPTIONS } from "@/utils/shifts";

const SHIFT_STYLES: Record<string, { shell: string; icon: string; text: string; accent: string }> = {
  MORNING: {
    shell: "bg-amber-50 border-amber-200",
    icon: "bg-amber-500 text-white shadow-amber-100",
    text: "text-amber-900",
    accent: "focus-within:border-amber-400",
  },
  NOON: {
    shell: "bg-sky-50 border-sky-200",
    icon: "bg-sky-500 text-white shadow-sky-100",
    text: "text-sky-900",
    accent: "focus-within:border-sky-400",
  },
  AFTERNOON: {
    shell: "bg-orange-50 border-orange-200",
    icon: "bg-orange-500 text-white shadow-orange-100",
    text: "text-orange-900",
    accent: "focus-within:border-orange-400",
  },
  NIGHT: {
    shell: "bg-slate-100 border-slate-200",
    icon: "bg-slate-700 text-white shadow-slate-200",
    text: "text-slate-900",
    accent: "focus-within:border-slate-400",
  },
};

export const DrugSplitModal = ({ selectedDrug, setSelectedDrug, saveSplitMutation }: any) => {
  const safeDrug = selectedDrug ?? {
    idPhieuThuoc: "",
    ten: "",
    donVi: "",
    hamLuong: "",
    loaiThuoc: "",
    lieuDung: "",
    maxQty: 0,
    splits: {
      MORNING: 0,
      NOON: 0,
      AFTERNOON: 0,
      NIGHT: 0,
    },
  };

  const formatSplitValue = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    return Number.isInteger(value) ? String(value) : String(value);
  };

  const parseSplitValue = (raw: string) => {
    const normalized = raw.replace(/\s+/g, "").replace(",", ".");
    if (!normalized) return 0;

    const value = Number(normalized);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };

  const [draftSplits, setDraftSplits] = useState<Record<string, string>>(() => ({
    MORNING: formatSplitValue(Number(safeDrug.splits.MORNING ?? 0)),
    NOON: formatSplitValue(Number(safeDrug.splits.NOON ?? 0)),
    AFTERNOON: formatSplitValue(Number(safeDrug.splits.AFTERNOON ?? 0)),
    NIGHT: formatSplitValue(Number(safeDrug.splits.NIGHT ?? 0)),
  }));

  useEffect(() => {
    setDraftSplits({
      MORNING: formatSplitValue(Number(safeDrug.splits.MORNING ?? 0)),
      NOON: formatSplitValue(Number(safeDrug.splits.NOON ?? 0)),
      AFTERNOON: formatSplitValue(Number(safeDrug.splits.AFTERNOON ?? 0)),
      NIGHT: formatSplitValue(Number(safeDrug.splits.NIGHT ?? 0)),
    });
  }, [
    selectedDrug?.idPhieuThuoc,
    safeDrug.splits.MORNING,
    safeDrug.splits.NOON,
    safeDrug.splits.AFTERNOON,
    safeDrug.splits.NIGHT,
  ]);

  const updateSplit = (shiftId: string, raw: string) => {
    setDraftSplits((prev) => ({
      ...prev,
      [shiftId]: raw,
    }));

    const parsed = parseSplitValue(raw);
    if (parsed == null) return;

    setSelectedDrug((prev: any) => ({
      ...prev,
      splits: { ...prev.splits, [shiftId]: parsed },
    }));
  };

  const nudgeSplit = (shiftId: string, delta: number) => {
    const current = Number(safeDrug.splits[shiftId] ?? 0);
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    updateSplit(shiftId, formatSplitValue(next));
  };

  const totalSplits =
    safeDrug.splits.MORNING +
    safeDrug.splits.NOON +
    safeDrug.splits.AFTERNOON +
    safeDrug.splits.NIGHT;

  const remainingQty = Math.round((safeDrug.maxQty - totalSplits) * 100) / 100;
  const isTotalMatched = useMemo(
    () => Math.abs(totalSplits - safeDrug.maxQty) < 0.000001,
    [safeDrug.maxQty, totalSplits]
  );
  const completionRatio =
    safeDrug.maxQty > 0 ? Math.min(100, Math.max(0, (totalSplits / safeDrug.maxQty) * 100)) : 0;
  const drugMeta = [
    safeDrug.hamLuong
      ? {
          key: "ham-luong",
          label: "Ham luong",
          value: safeDrug.hamLuong,
          tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
          icon: "fa-flask",
        }
      : null,
    safeDrug.loaiThuoc
      ? {
          key: "loai-thuoc",
          label: "Loai thuoc",
          value: safeDrug.loaiThuoc,
          tone: "border-violet-100 bg-violet-50 text-violet-700",
          icon: "fa-tag",
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    tone: string;
    icon: string;
  }>;

  if (!selectedDrug) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-2 pt-8 md:items-center md:p-4">
      <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm" onClick={() => setSelectedDrug(null)} />

      <div className="relative flex max-h-[calc(100vh-0.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] rounded-b-[22px] border border-white/50 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.20)] animate-in slide-in-from-bottom-4 duration-200 md:max-h-[90vh] md:rounded-[36px] md:zoom-in">
        <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center md:hidden">
          <span className="h-1.5 w-14 rounded-full bg-slate-300/90" />
        </div>

        <div className="relative overflow-hidden border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_38%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 pb-4 pt-6 md:px-7 md:py-6">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-200/30 blur-2xl" />
          <div className="absolute right-10 top-4 h-16 w-16 rounded-full bg-sky-200/30 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight text-slate-900 md:text-3xl">{safeDrug.ten}</h2>

              {drugMeta.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {drugMeta.map((meta) => (
                    <div
                      key={meta.key}
                      className={`inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold shadow-sm ${meta.tone}`}
                    >
                      <i className={`fa-solid ${meta.icon} text-[11px]`}></i>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] opacity-70">{meta.label}</span>
                      <span className="break-words leading-snug text-[13px] text-current">{meta.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 ring-1 ring-slate-200">
                  <i className="fa-solid fa-layer-group text-[10px] text-slate-400"></i>
                  Tổng đơn: {safeDrug.maxQty} {safeDrug.donVi || ""}
                </span>
                <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 ring-1 ring-slate-200">
                  <i className="fa-solid fa-notes-medical text-[10px] text-slate-400"></i>
                  <span className="break-words">{safeDrug.lieuDung || "Theo chỉ dẫn của bác sĩ"}</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedDrug(null)}
              className="shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/85 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-900 md:h-11 md:w-11"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-7 md:py-6">
          <div className="mb-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-3.5 md:mb-5 md:rounded-[28px] md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 md:gap-4">
                <div className="rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100 md:px-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Tổng đơn</div>
                  <div className="mt-1 text-xl font-black text-slate-900">{safeDrug.maxQty}</div>
                </div>
                <div className="rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100 md:px-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Đã chia</div>
                  <div className="mt-1 text-xl font-black text-primary">{totalSplits}</div>
                </div>
                <div className="rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100 md:px-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Còn lại</div>
                  <div className={`mt-1 text-xl font-black ${remainingQty === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {remainingQty}
                  </div>
                </div>
              </div>

              <div className="min-w-0 md:min-w-[180px]">
                <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em]">
                  <span className="text-slate-400">Tiến độ</span>
                  <span className={isTotalMatched ? "text-emerald-600" : "text-rose-600"}>
                    {isTotalMatched ? "Khớp số lượng" : "Chưa khớp"}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${isTotalMatched ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ width: `${completionRatio}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-4">
            {SHIFT_OPTIONS.map((option) => {
              const style = SHIFT_STYLES[option.id];

              return (
                <div
                  key={option.id}
                  className={`rounded-[24px] border p-3.5 transition-all md:rounded-[28px] md:p-5 ${style.shell} ${style.accent}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3 md:mb-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-md md:h-11 md:w-11 ${style.icon}`}>
                        <i className={`fa-solid ${option.icon}`}></i>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-black uppercase tracking-wide ${style.text}`}>{option.label}</div>
                        <div className="text-[11px] font-bold text-slate-500">{option.timeRange}</div>
                      </div>
                    </div>
                    <div className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 ring-1 ring-black/5">
                      #{option.label.slice(0, 1)}
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-white/90 p-3 shadow-sm ring-1 ring-black/5 md:rounded-[24px]">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Số lượng
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draftSplits[option.id]}
                      onChange={(e) => updateSplit(option.id, e.target.value)}
                      className={`w-full bg-transparent px-2 text-center font-black text-[30px] leading-none outline-none md:text-3xl ${style.text}`}
                    />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => nudgeSplit(option.id, -0.5)}
                        className="min-h-11 rounded-2xl bg-slate-100 px-3 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-600 transition hover:bg-slate-200"
                      >
                        - 0.5
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeSplit(option.id, 0.5)}
                        className="min-h-11 rounded-2xl bg-slate-900 px-3 py-2.5 text-[11px] font-black uppercase tracking-wide text-white transition hover:bg-black"
                      >
                        + 0.5
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-slate-50/85 md:px-7 md:py-4">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setSelectedDrug(null)}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-900 sm:min-h-0 sm:w-auto"
            >
              Đóng
            </button>

            <button
              disabled={!isTotalMatched || saveSplitMutation.isPending}
              onClick={() => {
                saveSplitMutation.mutate({ idPhieuThuoc: safeDrug.idPhieuThuoc, splits: safeDrug.splits });
                setSelectedDrug(null);
              }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-100 transition active:scale-95 disabled:opacity-50 sm:min-h-0 sm:w-auto"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              {saveSplitMutation.isPending ? "Đang lưu..." : "Lưu kết quả"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
