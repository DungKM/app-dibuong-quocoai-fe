import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { EncounterList } from "@/components/EncounterList";
import { MedicationList } from "@/components/MedicationList";
import { ShiftType } from "@/types/dibuong"; // ✅ dùng ShiftType thật của bạn (đang dùng trong MedicationList)

export const MedicationDetail: React.FC = () => {
    // Route: /medication/:id  (id ở đây coi như IdBenhAn)
    const { visitId } = useParams<{ visitId: string }>();
    const IdBenhAn = visitId ?? "";
    console.log(IdBenhAn);
    const navigate = useNavigate();
    const { search } = useLocation();
    const [searchParams] = useSearchParams();
    const { user: currentUser } = useAuth();

    const qs = new URLSearchParams(search);
    const maBenhNhan = qs.get("maBenhNhan") ?? "";
    const tenBenhNhan = qs.get("tenBenhNhan") ?? "";

    // ✅ chọn lần khám
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

    // ✅ ca trực
    const initialShift = (searchParams.get("shift") as ShiftType) || ShiftType.MORNING;
    const [activeShift, setActiveShift] = useState<ShiftType>(initialShift);

    // ✅ scan giả lập (giữ UI như bạn đang có)
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
        } catch (err) {
            setCameraError("Lỗi camera");
        }
    };

    useEffect(() => {
        if (isScanning) startCamera();
        else if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScanning]);

    if (!currentUser) return null;

    return (
        <div className="pb-24 max-w-[1000px] mx-auto space-y-6">
            {/* Header */}
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

            {/* ✅ Lần khám: dùng EncounterList thật */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mx-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Lần khám
                        </div>
                        <div className="text-slate-900 font-black mt-1">
                            Chọn lần khám để xem đơn thuốc
                        </div>
                    </div>
                </div>
                <EncounterList
                    idBenhAn={IdBenhAn}
                    selectedEncounterId={selectedEncounterId}
                    onChangeSelected={setSelectedEncounterId}
                    mode="latest"
                />
            </div>

            {/* ✅ Shift Filter */}
            <div className="bg-slate-100/50 p-1 rounded-2xl flex gap-1 shadow-inner mx-4">
                {[
                    { id: ShiftType.MORNING, label: "Sáng", icon: "fa-sun" },
                    { id: ShiftType.NOON, label: "Trưa", icon: "fa-cloud-sun" },
                    { id: ShiftType.AFTERNOON, label: "Chiều", icon: "fa-cloud" },
                    { id: ShiftType.NIGHT, label: "Tối", icon: "fa-moon" },
                ].map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setActiveShift(s.id)}
                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex flex-col items-center gap-1 ${activeShift === s.id ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:bg-white/40"
                            }`}
                    >
                        <i className={`fa-solid ${s.icon}`}></i> {s.label}
                    </button>
                ))}
            </div>
            <MedicationList idPhieuKham={selectedEncounterId} shift={activeShift} />
            {/* Scan UI Simulation */}
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
