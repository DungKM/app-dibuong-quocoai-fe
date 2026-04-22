import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { formatFractionValue, parseFractionValue } from "@/utils/fractions";

export const DrugActionModal = ({
  actionDrug,
  setActionDrug,
  returnQty,
  setReturnQty,
  returnReason,
  setReturnReason,
  confirmMutation,
  unconfirmMutation,
  activeShift,
  onReturn,
}: any) => {
  if (!actionDrug) return null;

  const isConfirm = actionDrug.type === "CONFIRM";
  const isUnconfirm = actionDrug.type === "UNCONFIRM";
  const isReturn = actionDrug.type === "RETURN";
  const maxReturnQty = Number(actionDrug.qty ?? 0);
  const displayShiftQty = formatFractionValue(maxReturnQty);
  const [returnQtyDraft, setReturnQtyDraft] = useState(() => formatFractionValue(Number(returnQty ?? 0)));

  useEffect(() => {
    setReturnQtyDraft(formatFractionValue(Number(returnQty ?? 0)));
  }, [actionDrug?.idPhieuThuoc, returnQty]);

  const palette = isConfirm
    ? "bg-emerald-50 text-emerald-500 shadow-emerald-100"
    : isUnconfirm
      ? "bg-amber-50 text-amber-500 shadow-amber-100"
      : "bg-red-50 text-red-500 shadow-red-100";

  const icon = isConfirm ? "fa-hand-holding-medical" : isUnconfirm ? "fa-rotate-left" : "fa-undo";
  const title = isConfirm
    ? "Xác nhận dùng thuốc"
    : isUnconfirm
      ? "Hủy xác nhận dùng thuốc"
      : "Yêu cầu trả thuốc";
  const primaryLabel = isConfirm
    ? "Xác nhận dùng thuốc"
    : isUnconfirm
      ? "Đồng ý hủy xác nhận"
      : "Đồng ý trả thuốc";
  const primaryClass = isConfirm
    ? "bg-green-600 shadow-green-100"
    : isUnconfirm
      ? "bg-amber-600 shadow-amber-100"
      : "bg-red-600 shadow-red-100";

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActionDrug(null)} />

      <div className="relative w-full max-w-sm rounded-[44px] bg-white p-8 shadow-2xl animate-in zoom-in duration-200 max-sm:max-w-xs">
        <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-lg ${palette}`}>
          <i className={`fa-solid ${icon}`}></i>
        </div>

        <h3 className="mb-2 text-center text-xl font-black uppercase tracking-tighter text-slate-900">{title}</h3>

        <div className="mb-6 rounded-2xl bg-slate-50 p-4">
          <div className="text-center text-sm font-bold uppercase leading-tight text-slate-900">{actionDrug.ten}</div>
          <div className="mt-1 text-center text-[10px] font-black uppercase tracking-widest text-primary">
            Số lượng trong ca: {displayShiftQty}
          </div>
        </div>

        {isReturn && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="ml-2 text-[10px] font-black uppercase text-slate-400">Số lượng thực trả</label>
              <input
                type="text"
                inputMode="text"
                value={returnQtyDraft}
                onChange={(e) => {
                  const raw = e.target.value;
                  setReturnQtyDraft(raw);

                  if (!raw.trim()) {
                    setReturnQty(0);
                    return;
                  }

                  const parsed = parseFractionValue(raw);
                  if (parsed == null) return;
                  setReturnQty(Math.max(0, Math.min(maxReturnQty, parsed)));
                }}
                onBlur={() => setReturnQtyDraft(formatFractionValue(Number(returnQty ?? 0)))}
                className="w-full rounded-2xl border-none bg-slate-100 px-4 py-3 text-lg font-black outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="mt-1 text-[10px] font-bold text-slate-400">Tối đa: {displayShiftQty}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="ml-2 text-[10px] font-black uppercase text-slate-400">Lý do trả lại</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full rounded-2xl border-none bg-slate-100 px-4 py-3 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Chọn lý do --</option>
                  <option value="Benh nhan tu choi">Bệnh nhân từ chối</option>
                  <option value="Ra vien">Bệnh nhân ra viện</option>
                  <option value="Bac si ngung thuoc">Bác sĩ ngưng thuốc</option>
                  <option value="Khac">Lý do khác...</option>
                </select>
              </div>

              {returnReason === "Khac" && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <textarea
                    placeholder="Nhập lý do cụ thể..."
                    rows={2}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-red-400 focus:outline-none"
                    onChange={(e) => {
                      (window as any)._otherReason = e.target.value;
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              if (isConfirm) {
                confirmMutation.mutate({
                  idPhieuThuoc: actionDrug.idPhieuThuoc,
                  shift: activeShift,
                  soLuongDung: actionDrug.qty,
                  tenThuoc: actionDrug.ten,
                  hamLuong: actionDrug.hamLuong,
                  loaiThuoc: actionDrug.loaiThuoc,
                  donVi: actionDrug.donVi,
                });
                setActionDrug(null);
                return;
              }

              if (isUnconfirm) {
                unconfirmMutation.mutate({ idPhieuThuoc: actionDrug.idPhieuThuoc, shift: activeShift });
                setActionDrug(null);
                return;
              }

              onReturn();
            }}
            disabled={isReturn && (!returnReason || returnQty <= 0)}
            className={`w-full rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-40 ${primaryClass}`}
          >
            {primaryLabel}
          </button>
          <button
            onClick={() => setActionDrug(null)}
            className="py-2 text-[10px] font-black uppercase text-slate-400 transition hover:text-slate-600"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
