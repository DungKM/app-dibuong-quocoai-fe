import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { SHIFT_OPTIONS } from "@/utils/shifts";

export const DrugSplitModal = ({ selectedDrug, setSelectedDrug, saveSplitMutation }: any) => {
  const safeDrug = selectedDrug ?? {
    idPhieuThuoc: "",
    ten: "",
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

  const totalSplits =
    safeDrug.splits.MORNING +
    safeDrug.splits.NOON +
    safeDrug.splits.AFTERNOON +
    safeDrug.splits.NIGHT;
  const isTotalMatched = useMemo(
    () => Math.abs(totalSplits - safeDrug.maxQty) < 0.000001,
    [safeDrug.maxQty, totalSplits]
  );

  if (!selectedDrug) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDrug(null)} />

      <div className="relative bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Chia thuoc theo ca</div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">{safeDrug.ten}</h2>
          </div>
          <button
            onClick={() => setSelectedDrug(null)}
            className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {SHIFT_OPTIONS.map((option) => (
            <div
              key={option.id}
              className="bg-slate-50 border-2 border-slate-100 rounded-[24px] p-4 focus-within:border-primary transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <i className={`fa-solid ${option.icon} text-xs text-slate-400`}></i>
                <span className="text-[10px] font-black text-slate-400 uppercase">{option.label}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-400 mb-2">{option.timeRange}</div>
              <input
                type="text"
                inputMode="decimal"
                value={draftSplits[option.id]}
                onChange={(e) => {
                  const raw = e.target.value;

                  setDraftSplits((prev) => ({
                    ...prev,
                    [option.id]: raw,
                  }));

                  const parsed = parseSplitValue(raw);
                  if (parsed == null) return;

                  setSelectedDrug((prev: any) => ({
                    ...prev,
                    splits: { ...prev.splits, [option.id]: parsed },
                  }));
                }}
                className="w-full bg-transparent font-black text-2xl text-slate-900 outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase">Trang thai chia</div>
            <div className={`text-xl font-black ${isTotalMatched ? "text-emerald-500" : "text-red-500"}`}>
              {totalSplits} / {safeDrug.maxQty}
            </div>
          </div>
          <button
            disabled={!isTotalMatched || saveSplitMutation.isPending}
            onClick={() => {
              saveSplitMutation.mutate({ idPhieuThuoc: safeDrug.idPhieuThuoc, splits: safeDrug.splits });
              setSelectedDrug(null);
            }}
            className="px-8 py-4 bg-primary text-white rounded-[24px] font-black uppercase text-xs shadow-lg shadow-blue-100 disabled:opacity-50 transition-all active:scale-95"
          >
            Luu ket qua
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
