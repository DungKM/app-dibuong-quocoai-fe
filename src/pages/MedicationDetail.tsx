import React, { useMemo, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { EncounterList } from "@/components/EncounterList";
import { ShiftType, SplitQty } from "@/types/dibuong";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MedicationOrders } from "@/components/MedicationOrders";
import { confirmMedUsage, getMedSplitsByEncounter, returnMedication, saveMedSplitOne } from "@/services/medSplit.api";
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
    // Thêm các state quản lý Action
    const [actionDrug, setActionDrug] = useState<{
        idPhieuThuoc: string;
        ten: string;
        qty: number;
        type: "CONFIRM" | "RETURN";
    } | null>(null);

    const [returnReason, setReturnReason] = useState("");
    const [returnQty, setReturnQty] = useState(0);

    // Mutation Xác nhận dùng thuốc
    const confirmMutation = useMutation({
        mutationFn: (idPhieuThuoc: string) =>
            confirmMedUsage(selectedEncounterId!, idPhieuThuoc),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });
            setActionDrug(null);
        }
    });

    // Mutation Trả thuốc
    const returnMutation = useMutation({
        mutationFn: (data: { idPhieuThuoc: string; quantity: number; reason: string }) =>
            returnMedication(selectedEncounterId!, data.idPhieuThuoc, {
                quantity: data.quantity,
                reason: data.reason
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["med-splits", selectedEncounterId] });
            setActionDrug(null);
            setReturnReason("");
        }
    });

    const totalSplits = useMemo(() => {
        if (!selectedDrug) return 0;
        return (
            Number(selectedDrug.splits.MORNING || 0) +
            Number(selectedDrug.splits.NOON || 0) +
            Number(selectedDrug.splits.AFTERNOON || 0) +
            Number(selectedDrug.splits.NIGHT || 0)
        );
    }, [selectedDrug?.splits]);
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
                mode="latest"
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
                        setReturnQty(data.qty);
                        setReturnReason("");
                    }
                    setActionDrug(data);
                }}
            />

            {selectedDrug && (
                <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Chia thuốc theo ca</div>
                                <div className="text-xl font-black text-slate-900 leading-tight mt-1">{selectedDrug.ten}</div>
                                <div className="mt-3 bg-amber-50 border border-amber-100 p-3 rounded-2xl flex gap-3">
                                    <i className="fa-solid fa-clipboard-check text-amber-500 mt-1"></i>
                                    <div>
                                        <div className="text-[10px] font-black text-amber-600 uppercase">Ghi chú liều dùng:</div>
                                        <div className="text-sm font-bold text-amber-900 leading-snug">
                                            {selectedDrug.lieuDung || "Không có ghi chú cụ thể"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => setSelectedDrug(null)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-5">
                            {[
                                { k: "MORNING", label: "Sáng", icon: "fa-sun" },
                                { k: "NOON", label: "Trưa", icon: "fa-cloud-sun" },
                                { k: "AFTERNOON", label: "Chiều", icon: "fa-cloud" },
                                { k: "NIGHT", label: "Tối", icon: "fa-moon" },
                            ].map((x) => (
                                <div key={x.k} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-primary transition">
                                    <div className="flex items-center gap-2">
                                        <i className={`fa-solid ${x.icon} text-[10px] text-slate-400`}></i>
                                        <div className="text-[10px] font-black text-slate-400 uppercase">{x.label}</div>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.5" 
                                        min={0}
                                        value={(selectedDrug.splits as any)[x.k]}
                                        onChange={(e) =>
                                            setSelectedDrug((prev) =>
                                                prev ? { ...prev, splits: { ...prev.splits, [x.k]: Number(e.target.value || 0) } } : prev
                                            )
                                        }
                                        className="mt-1 w-full bg-transparent font-black text-xl text-slate-900 outline-none"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* ✅ Hiển thị Tổng số lượng và Cảnh báo */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase">Tổng đã chia / Tổng đơn</div>
                                <div className={`text-lg font-black ${(selectedDrug.splits.MORNING + selectedDrug.splits.NOON + selectedDrug.splits.AFTERNOON + selectedDrug.splits.NIGHT) === selectedDrug.maxQty
                                    ? "text-green-600"
                                    : "text-red-500"
                                    }`}>
                                    {selectedDrug.splits.MORNING + selectedDrug.splits.NOON + selectedDrug.splits.AFTERNOON + selectedDrug.splits.NIGHT} / {selectedDrug.maxQty}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedDrug(null)}
                                    className="px-5 py-3 rounded-2xl font-black text-xs uppercase bg-slate-100 text-slate-700"
                                >
                                    Huỷ
                                </button>

                                <button
                                    onClick={() => {
                                        const total = selectedDrug.splits.MORNING + selectedDrug.splits.NOON + selectedDrug.splits.AFTERNOON + selectedDrug.splits.NIGHT;
                                        if (total !== selectedDrug.maxQty) {
                                            alert(`Tổng số lượng chia (${total}) phải bằng tổng đơn thuốc (${selectedDrug.maxQty}). Vui lòng kiểm tra lại!`);
                                            return;
                                        }
                                        saveSplitMutation.mutate({ idPhieuThuoc: selectedDrug.idPhieuThuoc, splits: selectedDrug.splits });
                                        setSelectedDrug(null);
                                    }}
                                    className="px-5 py-3 rounded-2xl font-black text-xs uppercase bg-primary text-white shadow-lg shadow-blue-100 disabled:opacity-50"
                                    disabled={saveSplitMutation.isPending}
                                >
                                    Lưu kết quả
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isScanning && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-md">
                    <div className="relative w-full max-w-sm aspect-square bg-slate-800 rounded-[48px] overflow-hidden border-8 border-slate-700 shadow-2xl mb-8 group">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted></video>
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-primary animate-pulse shadow-[0_0_20px_#0ea5e9]"></div>
                    </div>

                    {cameraError && <div className="text-red-400 font-bold mb-3">{cameraError}</div>}

                    <button
                        onClick={() => {
                            setIsScanning(false);
                            setIsVerified(true);
                        }}
                        className="bg-white text-slate-900 py-4 rounded-[24px] font-black text-sm uppercase shadow-xl flex items-center justify-center gap-3 px-8"
                    >
                        Mô phỏng quét: {maBenhNhan || "--"}
                    </button>
                </div>
            )}
            {actionDrug && (
                <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in duration-200">
                        <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl mb-6 ${actionDrug.type === "CONFIRM" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                            }`}>
                            <i className={`fa-solid ${actionDrug.type === "CONFIRM" ? "fa-hand-holding-medical" : "fa-undo"}`}></i>
                        </div>

                        <h3 className="text-xl font-black text-slate-900 text-center mb-2">
                            {actionDrug.type === "CONFIRM" ? "Xác nhận dùng thuốc" : "Yêu cầu trả thuốc"}
                        </h3>

                        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                            <div className="text-sm font-bold text-slate-900 text-center">{actionDrug.ten}</div>
                            <div className="text-[10px] font-black text-primary mt-1 uppercase text-center">
                                Số lượng trong ca: {actionDrug.qty}
                            </div>
                        </div>

                        {actionDrug.type === "RETURN" && (
                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Số lượng thực trả</label>
                                    <input
                                        type="number"
                                        max={actionDrug.qty}
                                        value={returnQty}
                                        onChange={(e) => setReturnQty(Number(e.target.value))}
                                        className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 font-black text-lg focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Lý do trả lại</label>
                                        <select
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-red-500 transition-all"
                                        >
                                            <option value="">-- Chọn lý do --</option>
                                            <option value="Bệnh nhân từ chối">Bệnh nhân từ chối</option>
                                            <option value="Ra viện">Bệnh nhân ra viện</option>
                                            <option value="Bác sĩ ngừng thuốc">Bác sĩ ngừng thuốc</option>
                                            <option value="Khác">Lý do khác...</option>
                                        </select>
                                    </div>

                                    {/* ✅ Nếu chọn "Khác" thì hiện thêm ô nhập text tự do */}
                                    {returnReason === "Khác" && (
                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                            <textarea
                                                placeholder="Vui lòng nhập lý do cụ thể..."
                                                rows={3}
                                                // Bạn có thể dùng 1 state riêng (ví dụ: otherReason) hoặc ghi đè trực tiếp
                                                onChange={(e) => {
                                                    // Mẹo: Khi gửi API, nếu reason là "Khác", hãy lấy giá trị từ ô này
                                                    window._otherReason = e.target.value;
                                                }}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-red-400"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* NÚT BẤM HÀNH ĐỘNG */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    if (actionDrug.type === "CONFIRM") {
                                        confirmMutation.mutate(actionDrug.idPhieuThuoc);
                                    } else {
                                        returnMutation.mutate({
                                            idPhieuThuoc: actionDrug.idPhieuThuoc,
                                            quantity: returnQty,
                                            reason: returnReason
                                        });
                                    }
                                }}
                                disabled={actionDrug.type === "RETURN" && (!returnReason || returnQty <= 0)}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition disabled:opacity-50 ${actionDrug.type === "CONFIRM" ? "bg-green-600 shadow-green-100" : "bg-red-600 shadow-red-100"
                                    }`}
                            >
                                Đồng ý xác nhận
                            </button>
                            <button
                                onClick={() => setActionDrug(null)}
                                className="font-black text-xs text-slate-400 uppercase py-2 hover:text-slate-600 transition"
                            >
                                Hủy bỏ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
