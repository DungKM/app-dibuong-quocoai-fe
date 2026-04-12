import React from "react";
import { createPortal } from "react-dom";

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

      <div className="relative bg-white w-full max-sm:max-w-xs max-w-sm rounded-[44px] p-8 shadow-2xl animate-in zoom-in duration-200">
        <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-6 shadow-lg ${palette}`}>
          <i className={`fa-solid ${icon}`}></i>
        </div>

        <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase tracking-tighter">{title}</h3>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="text-sm font-bold text-slate-900 text-center uppercase leading-tight">{actionDrug.ten}</div>
          <div className="text-[10px] font-black text-primary mt-1 uppercase text-center tracking-widest">
            Số lượng trong ca: {actionDrug.qty}
          </div>
        </div>

        {isReturn && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Số lượng thực trả</label>
              <input
                type="number"
                max={actionDrug.qty}
                min={1}
                value={returnQty}
                onChange={(e) => setReturnQty(Number(e.target.value))}
                className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 font-black text-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Lý do trả lại</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-red-500 transition-all outline-none"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-red-400"
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
                confirmMutation.mutate({ idPhieuThuoc: actionDrug.idPhieuThuoc, shift: activeShift });
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
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-40 ${primaryClass}`}
          >
            {primaryLabel}
          </button>
          <button
            onClick={() => setActionDrug(null)}
            className="font-black text-[10px] text-slate-400 uppercase py-2 hover:text-slate-600 transition"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
