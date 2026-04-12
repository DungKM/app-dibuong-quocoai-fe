import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { CameraScannerModal } from "@/components/CameraScannerModal";
import { DrugActionModal } from "@/components/DrugActionModal";
import { DrugSplitModal } from "@/components/DrugSplitModal";
import { EncounterList } from "@/components/EncounterList";
import { MedicationOrders } from "@/components/MedicationOrders";
import { useAuth } from "@/context/AuthContext";
import { getDonThuocByPhieuKham } from "@/services/dibuong.api";
import {
  autoSplitAllMeds,
  cancelConfirmedUsage,
  confirmAllMedUsage,
  confirmMedUsage,
  getMedSplitsByEncounter,
  returnMedication,
  saveMedSplitOne,
} from "@/services/medSplit.api";
import { ShiftType, SplitQty } from "@/types/dibuong";
import { getCurrentShift, SHIFT_OPTIONS } from "@/utils/shifts";

type TabType = "PENDING" | "COMPLETED";

export const MedicationDetail: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("PENDING");

  const { id } = useParams<{ id: string }>();
  const idBenhAn = id ?? "";

  const navigate = useNavigate();
  const { search } = useLocation();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();

  const qs = new URLSearchParams(search);
  const maBenhNhan = qs.get("maBenhNhan") ?? "";
  const tenBenhNhan = qs.get("tenBenhNhan") ?? "";

  const initialEncounterId = searchParams.get("idPhieuKham");
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(initialEncounterId);

  const initialShift = (searchParams.get("shift") as ShiftType) || getCurrentShift();
  const [activeShift, setActiveShift] = useState<ShiftType>(initialShift);

  const [selectedDrug, setSelectedDrug] = useState<{
    idPhieuThuoc: string;
    ten: string;
    splits: SplitQty;
    maxQty: number;
    lieuDung: string;
  } | null>(null);

  const [isVerified, setIsVerified] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [actionDrug, setActionDrug] = useState<{
    idPhieuThuoc: string;
    ten: string;
    qty: number;
    type: "CONFIRM" | "RETURN" | "UNCONFIRM";
  } | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const qc = useQueryClient();

  const startCamera = async () => {
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError("Lỗi camera");
    }
  };

  useEffect(() => {
    if (isScanning) {
      startCamera();
      return;
    }

    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
    }
  }, [isScanning]);

  const { data: splitData, isFetching: splitLoading } = useQuery({
    queryKey: ["med-splits", selectedEncounterId],
    enabled: !!selectedEncounterId,
    queryFn: () => getMedSplitsByEncounter(selectedEncounterId!),
    staleTime: 60_000,
  });

  const saveSplitMutation = useMutation({
    mutationFn: ({ idPhieuThuoc, splits }: { idPhieuThuoc: string; splits: SplitQty }) =>
      saveMedSplitOne(selectedEncounterId!, idPhieuThuoc, splits),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: ({ idPhieuThuoc, shift }: { idPhieuThuoc: string; shift: ShiftType }) =>
      confirmMedUsage(selectedEncounterId!, idPhieuThuoc, shift),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });
      setActionDrug(null);
    },
  });

  const unconfirmMutation = useMutation({
    mutationFn: ({ idPhieuThuoc, shift }: { idPhieuThuoc: string; shift: ShiftType }) =>
      cancelConfirmedUsage(selectedEncounterId!, idPhieuThuoc, shift),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });
      setActionDrug(null);
      toast.success("Đã hủy xác nhận dùng thuốc");
    },
  });

  const { data: donThuocData } = useQuery({
    queryKey: ["donthuoc", selectedEncounterId],
    enabled: !!selectedEncounterId,
    queryFn: () => getDonThuocByPhieuKham(selectedEncounterId!),
  });

  const returnMutation = useMutation({
    mutationFn: (data: any) => returnMedication(selectedEncounterId!, data.idPhieuThuoc, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });
      setActionDrug(null);
      setReturnReason("");
      toast.success("Đã gửi yêu cầu trả thuốc");
    },
  });

  const autoSplitMutation = useMutation({
    mutationFn: async () => {
      const items = (donThuocData ?? []).map((item) => ({
        idPhieuThuoc: String(item.IdPhieuThuoc),
        tenThuoc: item.Ten || "",
        lieuDung: item.LieuDung || "",
        maxQty: Number(item.SoLuong || 0),
      }));

      return autoSplitAllMeds(selectedEncounterId!, items);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });

      const summary = res?.summary || res?.data?.summary;
      toast.success(
        `Tự động chia xong. OK: ${summary?.autoSuccess ?? 0}, cần kiểm tra: ${summary?.needsReview ?? 0}, lỗi: ${summary?.failed ?? 0}`
      );
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "Tự động chia ca thất bại");
    },
  });

  const confirmAllMutation = useMutation({
    mutationFn: (shift: ShiftType) => confirmAllMedUsage(selectedEncounterId!, shift),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });
      toast.success("Đã xác nhận dùng toàn bộ thuốc trong ca");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Xác nhận dùng toàn bộ thất bại");
    },
  });

  const activeShiftOption = SHIFT_OPTIONS.find((option) => option.id === activeShift);
  const hasConfirmableMedsInActiveShift = useMemo(() => {
    const splitMap = splitData?.splits ?? {};
    const key = activeShift as keyof SplitQty;

    return Object.values(splitMap).some((item) => {
      const qtyInShift = Number(item.splits?.[key] ?? 0);
      const returnedQty =
        item.returnHistory?.reduce((sum, historyItem: any) => {
          return historyItem.shift === activeShift ? sum + Number(historyItem.quantity ?? 0) : sum;
        }, 0) ?? 0;
      const isConfirmed = item.confirmedShifts?.includes(activeShift) ?? false;
      return qtyInShift - returnedQty > 0 && !isConfirmed;
    });
  }, [activeShift, splitData]);

  if (!currentUser) return null;

  return (
    <div className="mx-auto space-y-6 pb-24">
      <div className="sticky top-16 z-30 flex flex-col items-start justify-between gap-6 rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400 transition hover:text-primary"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              {tenBenhNhan || "Bệnh nhân"}
            </h1>
            <div className="mt-0.5 flex items-center gap-3 text-xs font-bold text-slate-400">
              <span className="font-mono text-primary">{maBenhNhan || "--"}</span>
              <span>•</span>
              <span className="uppercase">Đơn thuốc dùng</span>
            </div>
          </div>
        </div>

        {/* <div className="flex gap-2 w-full md:w-auto">
          {isVerified ? (
            <div className="flex-1 md:flex-none bg-green-500 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-green-200">
              <i className="fa-solid fa-shield-check text-base"></i> Đã xác thực BN
            </div>
          ) : (
            <button
              onClick={() => setIsScanning(true)}
              className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:bg-black transition"
            >
              <i className="fa-solid fa-qrcode text-base"></i> Quét mã xác nhận
            </button>
          )}
        </div> */}
      </div>

      <EncounterList
        idBenhAn={idBenhAn}
        selectedEncounterId={selectedEncounterId}
        onChangeSelected={setSelectedEncounterId}
        mode="all"
      />

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`flex-1 border-b-2 py-4 text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "PENDING" ? "border-primary text-primary" : "border-transparent text-slate-400"
          }`}
        >
          Chưa chia ca
        </button>
        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`flex-1 border-b-2 py-4 text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "COMPLETED" ? "border-primary text-primary" : "border-transparent text-slate-400"
          }`}
        >
          Đã chia ca
        </button>
      </div>

      <button
        onClick={() => autoSplitMutation.mutate()}
        disabled={!selectedEncounterId || autoSplitMutation.isPending}
        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase text-white shadow-lg disabled:opacity-50 md:flex-none"
      >
        <i className="fa-solid fa-wand-magic-sparkles text-base"></i>
        {autoSplitMutation.isPending ? "Đang tự động chia..." : "Tự động chia toàn bộ"}
      </button>

      {activeTab === "COMPLETED" && (
        <div className="mx-4 space-y-3 animate-in fade-in duration-300">
          <div className="flex gap-1 rounded-2xl bg-slate-100/50 p-1 shadow-inner">
            {SHIFT_OPTIONS.map((option) => {
              const hasDataInShift = Object.values(splitData?.splits ?? {}).some(
                (item) => Number(item.splits[option.id as keyof SplitQty] ?? 0) > 0
              );

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveShift(option.id)}
                  title={`${option.label} (${option.timeRange})`}
                  className={`relative flex-1 rounded-xl py-3 text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${
                    activeShift === option.id ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:bg-white/40"
                  }`}
                >
                  {hasDataInShift && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm"></span>
                  )}

                  <i
                    className={`fa-solid ${option.icon} ${
                      hasDataInShift && activeShift !== option.id ? "text-slate-600" : ""
                    }`}
                  ></i>
                  <span className={hasDataInShift && activeShift !== option.id ? "text-slate-600" : ""}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Xác nhận nhanh
              </div>
              <div className="truncate text-[11px] font-bold text-emerald-900">
                Dùng toàn bộ thuốc của ca đang chọn
              </div>
            </div>

            <button
              type="button"
              onClick={() => confirmAllMutation.mutate(activeShift)}
              disabled={!selectedEncounterId || !hasConfirmableMedsInActiveShift || confirmAllMutation.isPending}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-white shadow-md shadow-emerald-100 transition disabled:opacity-50 disabled:shadow-none"
            >
              <i className="fa-solid fa-check-double"></i>
              {confirmAllMutation.isPending ? "Đang xử lý..." : `Xác nhận ca ${activeShiftOption?.label ?? ""}`}
            </button>
          </div>
        </div>
      )}

      <MedicationOrders
        idPhieuKham={selectedEncounterId}
        shift={activeShift}
        splitMap={splitData?.splits ?? {}}
        splitLoading={splitLoading}
        filterTab={activeTab}
        onPickDrug={(drug) => {
          const currentInfo = splitData?.splits?.[drug.idPhieuThuoc]?.splits;
          setSelectedDrug({
            idPhieuThuoc: drug.idPhieuThuoc,
            ten: drug.ten,
            maxQty: drug.maxQty,
            lieuDung: drug.lieuDung,
            splits: {
              MORNING: Number(currentInfo?.MORNING ?? 0),
              NOON: Number(currentInfo?.NOON ?? 0),
              AFTERNOON: Number(currentInfo?.AFTERNOON ?? 0),
              NIGHT: Number(currentInfo?.NIGHT ?? 0),
            },
          });
        }}
        onAction={(data) => {
          if (data.type === "RETURN") {
            setReturnQuantity(data.qty);
            setReturnReason("");
          }
          setActionDrug(data);
        }}
      />

      {selectedDrug && (
        <DrugSplitModal
          selectedDrug={selectedDrug}
          setSelectedDrug={setSelectedDrug}
          saveSplitMutation={saveSplitMutation}
        />
      )}

      {isScanning && (
        <CameraScannerModal
          isScanning={isScanning}
          setIsScanning={setIsScanning}
          videoRef={videoRef}
          cameraError={cameraError}
          maBenhNhan={maBenhNhan}
          setIsVerified={setIsVerified}
        />
      )}

      {actionDrug && (
        <DrugActionModal
          actionDrug={actionDrug}
          setActionDrug={setActionDrug}
          returnQty={returnQuantity}
          setReturnQty={setReturnQuantity}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          confirmMutation={confirmMutation}
          unconfirmMutation={unconfirmMutation}
          returnMutation={returnMutation}
          activeShift={activeShift}
          onReturn={() => {
            if (!actionDrug || !selectedEncounterId) return;

            const finalReason = returnReason === "Khac" ? (window as any)._otherReason : returnReason;

            returnMutation.mutate({
              idPhieuThuoc: actionDrug.idPhieuThuoc,
              quantity: returnQuantity,
              reason: finalReason,
              tenBenhNhan: tenBenhNhan || "N/A",
              maBenhNhan: maBenhNhan || "N/A",
              tenThuoc: actionDrug.ten,
              idBenhAn,
              shift: activeShift,
            });
          }}
        />
      )}
    </div>
  );
};
