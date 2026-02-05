import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { EncounterList } from "@/components/EncounterList";
import { ShiftType, SplitQty } from "@/types/dibuong";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MedicationOrders } from "@/components/MedicationOrders";
import { getMedSplitsByEncounter, saveMedSplitOne } from "@/services/medSplit.api";
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

    if (!currentUser) return null;
    return (
        <div className="pb-24 max-w-[1000px] mx-auto space-y-6">
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

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mx-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lần khám</div>
                        <div className="text-slate-900 font-black mt-1">Chọn lần khám để xem đơn thuốc</div>
                    </div>
                </div>
                <EncounterList
                    idBenhAn={IdBenhAn}
                    selectedEncounterId={selectedEncounterId}
                    onChangeSelected={setSelectedEncounterId}
                    mode="latest"
                />
            </div>

            <div className="flex border-b border-slate-200 mx-4">
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
                    ].map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setActiveShift(s.id)}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex flex-col items-center gap-1 ${
                                activeShift === s.id ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:bg-white/40"
                            }`}
                        >
                            <i className={`fa-solid ${s.icon}`}></i> {s.label}
                        </button>
                    ))}
                </div>
            )}

            <MedicationOrders
                idPhieuKham={selectedEncounterId}
                shift={activeShift}
                splitMap={splitData?.splits ?? {}}
                splitLoading={splitLoading}
                filterTab={activeTab}
                onPickDrug={(drug) => {
                    setSelectedDrug({
                        idPhieuThuoc: drug.idPhieuThuoc,
                        ten: drug.ten,
                        maxQty: drug.maxQty,
                        lieuDung: drug.lieuDung,
                        splits: { ...(splitData?.splits?.[drug.idPhieuThuoc] ?? ZERO) },
                    });
                }}
            />

            {selectedDrug && (
                <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Chia thuốc theo ca</div>
                                <div className="text-xl font-black text-slate-900 leading-tight mt-1">{selectedDrug.ten}</div>

                                {/* ✅ Hiển thị Note của bác sĩ */}
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
                                        step="0.5" // Hỗ trợ chia nửa viên nếu cần
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
        </div>
    );
};
