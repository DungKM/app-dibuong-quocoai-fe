import React, { useMemo, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { EncounterList } from "@/components/EncounterList";
import { ShiftType, SplitQty } from "@/types/dibuong";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MedicationOrders } from "@/components/MedicationOrders";
import { confirmMedUsage, getMedSplitsByEncounter, returnMedication, saveMedSplitOne } from "@/services/medSplit.api";
import { DrugSplitModal } from "@/components/DrugSplitModal";
import { CameraScannerModal } from "@/components/CameraScannerModal";
import { DrugActionModal } from "@/components/DrugActionModal";
import toast from "react-hot-toast";
import { autoSplitAllMeds } from "@/services/medSplit.api";

import { getDonThuocByPhieuKham } from "@/services/dibuong.api";

type TabType = "PENDING" | "COMPLETED";

const ZERO: SplitQty = { MORNING: 0, NOON: 0, AFTERNOON: 0, NIGHT: 0 };

export const MedicationDetail: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>("PENDING");

    const { id } = useParams<{ id: string }>();
    const IdBenhAn = id ?? "";

    const navigate = useNavigate();
    const { search } = useLocation();
    const [searchParams] = useSearchParams();
    const { user: currentUser } = useAuth();

    const qs = new URLSearchParams(search);
    const maBenhNhan = qs.get("maBenhNhan") ?? "";
    const tenBenhNhan = qs.get("tenBenhNhan") ?? "";

    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

    const initialShift = (searchParams.get("shift") as ShiftType) || ShiftType.MORNING;
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
    const videoRef = useRef<HTMLVideoElement>(null);

    const startCamera = async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch {
            setCameraError("Lỗi camera");
        }
    };

    useEffect(() => {
        if (isScanning) startCamera();
        else if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        }
    }, [isScanning]);

    const qc = useQueryClient();
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
    const [actionDrug, setActionDrug] = useState<{
        idPhieuThuoc: string;
        ten: string;
        qty: number;
        type: "CONFIRM" | "RETURN";
    } | null>(null);

    const [returnReason, setReturnReason] = useState("");
    const [returnQuantity, setReturnQuantity] = useState(1);
    const confirmMutation = useMutation({
        mutationFn: (idPhieuThuoc: string) =>
            confirmMedUsage(selectedEncounterId!, idPhieuThuoc),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });
            setActionDrug(null);
        }
    });
    const { data: donThuocData } = useQuery({
        queryKey: ["donthuoc", selectedEncounterId],
        enabled: !!selectedEncounterId,
        queryFn: () => getDonThuocByPhieuKham(selectedEncounterId!),
    });
    // Mutation Trả thuốc
    const returnMutation = useMutation({
        mutationFn: (data: any) => returnMedication(selectedEncounterId!, data.idPhieuThuoc, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });
            setActionDrug(null);
            setReturnReason("");
            toast.success("Đã gửi yêu cầu trả thuốc");
        }
    });
    const handleReturn = (payload: { quantity: number; reason: string }) => {
        if (!actionDrug) return;

        returnMutation.mutate({
            idPhieuThuoc: actionDrug.idPhieuThuoc,
            quantity: payload.quantity,
            reason: payload.reason,
            tenThuoc: actionDrug.ten,
        });
    };
    const totalSplits = useMemo(() => {
        if (!selectedDrug) return 0;
        return (
            Number(selectedDrug.splits.MORNING || 0) +
            Number(selectedDrug.splits.NOON || 0) +
            Number(selectedDrug.splits.AFTERNOON || 0) +
            Number(selectedDrug.splits.NIGHT || 0)
        );
    }, [selectedDrug?.splits]);

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
            toast.error(
                error?.response?.data?.message || error?.message || "Tự động chia ca thất bại"
            );
        },
    });

    if (!currentUser) return null;
    return (
        <div className="pb-24 mx-auto space-y-6">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sticky top-16 z-30">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-primary transition flex items-center justify-center border border-slate-100"
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                            {tenBenhNhan || "Bệnh nhân"}
                        </h1>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400 mt-0.5">
                            <span className="text-primary font-mono">{maBenhNhan || "--"}</span>
                            <span>•</span>
                            <span className="uppercase">Đơn thuốc</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
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
                </div>
            </div>
            <EncounterList
                idBenhAn={IdBenhAn}
                selectedEncounterId={selectedEncounterId}
                onChangeSelected={setSelectedEncounterId}
                mode="all"
            />
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("PENDING")}
                    className={`flex-1 py-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${activeTab === "PENDING" ? "border-primary text-primary" : "border-transparent text-slate-400"
                        }`}
                >
                    Chưa chia ca
                </button>
                <button
                    onClick={() => setActiveTab("COMPLETED")}
                    className={`flex-1 py-4 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${activeTab === "COMPLETED" ? "border-primary text-primary" : "border-transparent text-slate-400"
                        }`}
                >
                    Đã chia xong
                </button>
            </div>
            <button
                onClick={() => autoSplitMutation.mutate()}
                disabled={!selectedEncounterId || autoSplitMutation.isPending}
                className="flex-1 md:flex-none bg-primary text-white px-5 py-3 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
                <i className="fa-solid fa-wand-magic-sparkles text-base"></i>
                {autoSplitMutation.isPending ? "Đang tự động chia..." : "Tự động chia toàn bộ"}
            </button>
            {activeTab === "COMPLETED" && (
                <div className="bg-slate-100/50 p-1 rounded-2xl flex gap-1 shadow-inner mx-4 animate-in fade-in duration-300">
                    {[
                        { id: ShiftType.MORNING, label: "Sáng", icon: "fa-sun" },
                        { id: ShiftType.NOON, label: "Trưa", icon: "fa-cloud-sun" },
                        { id: ShiftType.AFTERNOON, label: "Chiều", icon: "fa-cloud" },
                        { id: ShiftType.NIGHT, label: "Tối", icon: "fa-moon" },
                    ].map((s) => {
                        const hasDataInShift = Object.values(splitData?.splits ?? {}).some(
                            (m) => Number(m.splits[s.id as keyof SplitQty] ?? 0) > 0
                        );

                        return (
                            <button
                                key={s.id}
                                onClick={() => setActiveShift(s.id)}
                                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex flex-col items-center gap-1 relative ${activeShift === s.id
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-slate-400 hover:bg-white/40"
                                    }`}
                            >
                                {hasDataInShift && (
                                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm"></span>
                                )}

                                <i className={`fa-solid ${s.icon} ${hasDataInShift && activeShift !== s.id ? "text-slate-600" : ""}`}></i>
                                <span className={hasDataInShift && activeShift !== s.id ? "text-slate-600" : ""}>
                                    {s.label}
                                </span>
                            </button>
                        );
                    })}
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
                    returnMutation={returnMutation}
                    onReturn={() => {
                        if (!actionDrug || !selectedEncounterId) return;

                        // Lấy lý do cuối cùng (nếu chọn 'Khác' thì lấy từ window._otherReason)
                        const finalReason = returnReason === "Khác" ? (window as any)._otherReason : returnReason;

                        // Gửi đầy đủ thông tin định danh để Socket.io Backend nhận được
                        returnMutation.mutate({
                            idPhieuThuoc: actionDrug.idPhieuThuoc,
                            quantity: returnQuantity,
                            reason: finalReason,
                            tenBenhNhan: tenBenhNhan || "N/A",
                            maBenhNhan: maBenhNhan || "N/A",
                            tenThuoc: actionDrug.ten,
                        });
                    }}
                />
            )}
        </div>
    );
};
