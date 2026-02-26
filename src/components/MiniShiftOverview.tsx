
import React from "react";
export const MiniShiftOverview: React.FC<{
    label: string;
    used: number;
    pending: number;
    isActive?: boolean;
}> = ({ label, used, pending, isActive }) => (
    <div
        className={`flex flex-col items-center flex-1 py-0.5 rounded-lg transition-all ${isActive
            ? "bg-primary text-white ring-1 ring-primary/20 shadow-sm"
            : "bg-slate-50 text-slate-400"
            }`}
    >
        <span className="text-[6px] font-black uppercase mb-0">{label}</span>
        <div className="flex gap-0.5 items-center">
            <span
                className={`text-[9px] font-black ${isActive ? "text-white" : used > 0 ? "text-primary" : "text-slate-300"
                    }`}
            >
                {used}
            </span>
            <span className="text-[6px] opacity-10">/</span>
            <span
                className={`text-[9px] font-black ${isActive ? "text-white" : pending > 0 ? "text-amber-500" : "text-slate-300"
                    }`}
            >
                {pending}
            </span>
        </div>
    </div>
);