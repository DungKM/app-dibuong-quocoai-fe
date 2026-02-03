
import React from "react";
import { MedVisitLite, ShiftType } from "@/types/dibuong";
import { MiniShiftOverview } from "./MiniShiftOverview";
import { useNavigate } from "react-router-dom";

export const MedicationBedCard: React.FC<{
    bedCode: string;
    visit?: MedVisitLite;
    activeShift: ShiftType;
    isClosed: boolean;
}> = ({ bedCode, visit, activeShift, isClosed }) => {
    const navigate = useNavigate();
    const isOccupied = !!visit;

    const shiftStats = visit?.marSummary?.shifts;
    const current = shiftStats ? shiftStats[activeShift] : { used: 0, pending: 0, returned: 0 };

    const hasReturns = current.returned > 0;
    const hasPending = current.pending > 0;

    const getStatusClasses = () => {
        if (!isOccupied) return "bg-slate-50 border-dashed border-slate-300 opacity-90 cursor-default";
        if (hasReturns) return "bg-purple-50 border-purple-300 ring-2 ring-purple-100";
        if (hasPending) return "bg-amber-50 border-amber-300 ring-1 ring-amber-100 shadow-sm";
        if (current.used > 0) return "bg-blue-50 border-primary/20";
        return "bg-white border-slate-200 shadow-sm";
    };
    return (
        <div
            onClick={() => isOccupied && navigate(`/medication/${visit!.id}?shift=${activeShift}`)}
            className={`relative h-44 rounded-[28px] border-2 transition-all duration-300 p-4 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:-translate-y-1 ${getStatusClasses()} ${isClosed && isOccupied ? "opacity-90" : ""
                }`}
        >
            <div className="flex justify-between items-start">
                <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm ${isOccupied ? "bg-white text-primary border border-primary/10" : "bg-slate-50 text-slate-300"
                        }`}
                >
                    {bedCode}
                </span>

                {isOccupied && hasReturns && (
                    <span className="bg-purple-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                        Cần trả kho
                    </span>
                )}
            </div>

            {isOccupied ? (
                <div className="min-w-0 flex-1 flex flex-col justify-center my-1">
                    <h3 className="text-base font-black text-slate-900 leading-tight truncate uppercase tracking-tight">
                        {visit!.patientName}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-0.5">
                        <span className="text-primary font-mono tracking-tighter">{visit!.patientCode}</span>
                        <span>•</span>
                        <span className="uppercase">{visit!.patientGender ?? "--"}</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center flex-1 opacity-5">
                    <i className="fa-solid fa-bed text-4xl"></i>
                </div>
            )}

            {isOccupied && shiftStats && (
                <div className="space-y-1.5 mt-auto pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-3 gap-0.5 text-center">
                        <div>
                            <div className="text-[6px] font-black text-slate-400 uppercase">Dùng</div>
                            <div className={`text-base font-black ${current.used > 0 ? "text-primary" : "text-slate-200"}`}>
                                {current.used}
                            </div>
                        </div>
                        <div className="border-x border-slate-100">
                            <div className="text-[6px] font-black text-slate-400 uppercase">Chờ</div>
                            <div
                                className={`text-base font-black ${current.pending > 0 ? "text-amber-500 animate-pulse" : "text-slate-200"}`}
                            >
                                {current.pending}
                            </div>
                        </div>
                        <div>
                            <div className="text-[6px] font-black text-slate-400 uppercase">Trả</div>
                            <div className={`text-base font-black ${current.returned > 0 ? "text-purple-600" : "text-slate-200"}`}>
                                {current.returned}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-0.5 bg-slate-100/50 p-0.5 rounded-lg">
                        <MiniShiftOverview label="S" {...shiftStats[ShiftType.MORNING]} isActive={activeShift === ShiftType.MORNING} />
                        <MiniShiftOverview label="T" {...shiftStats[ShiftType.NOON]} isActive={activeShift === ShiftType.NOON} />
                        <MiniShiftOverview
                            label="C"
                            {...shiftStats[ShiftType.AFTERNOON]}
                            isActive={activeShift === ShiftType.AFTERNOON}
                        />
                        <MiniShiftOverview label="Đ" {...shiftStats[ShiftType.NIGHT]} isActive={activeShift === ShiftType.NIGHT} />
                    </div>
                </div>
            )}
        </div>
    );
};