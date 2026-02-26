import React from "react";
import { createPortal } from "react-dom";

export const CameraScannerModal = ({ isScanning, setIsScanning, videoRef, cameraError, maBenhNhan, setIsVerified }: any) => {
    if (!isScanning) return null;

    return createPortal(
        <div className="fixed inset-0 z-[300] bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-[64px] overflow-hidden border-[12px] border-slate-800 shadow-2xl mb-12">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-primary animate-pulse shadow-[0_0_30px_#0ea5e9]" />
            </div>

            <h3 className="text-white font-black uppercase tracking-[0.3em] mb-8">Đang quét mã định danh...</h3>

            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button
                    onClick={() => { setIsScanning(false); setIsVerified(true); }}
                    className="w-full py-5 bg-white text-slate-900 rounded-[28px] font-black uppercase text-sm shadow-xl"
                >
                    Mô phỏng quét: {maBenhNhan}
                </button>
                <button onClick={() => setIsScanning(false)} className="text-slate-500 font-black uppercase text-xs">Đóng camera</button>
            </div>
        </div>,
        document.body
    );
};