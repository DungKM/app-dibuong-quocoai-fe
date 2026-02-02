import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDienBienByPhieuKham } from "@/services/dibuong.api";
import type { DienBienItem } from "@/types/dibuong";

type Props = {
  idPhieuKham: string | null; 
};

type NoteUI = {
  
  id: string;
  time: string;
  author: string;
  type: "Bác sĩ";
  content: string;
};

export const EncounterTimeline: React.FC<Props> = ({ idPhieuKham }) => {
  const { data, isLoading, error } = useQuery<DienBienItem[]>({
    queryKey: ["dienbien", idPhieuKham],
    enabled: !!idPhieuKham,
    queryFn: () => getDienBienByPhieuKham(idPhieuKham!),
  });

  const notes: NoteUI[] = useMemo(() => {
    const list = data ?? [];
    return list.map((x, idx) => ({
      id: `${x.IdPhieuKham}-${idx}`,
      time: x.NgayThucKham ?? "",
      author: x.BacSiKham ?? "--",
      type: "Bác sĩ",
      content: x.DienBienBenh ?? "",
    }));
  }, [data]);

  if (!idPhieuKham) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 font-bold">
        Chọn một lần khám để xem diễn biến.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 font-bold">
        Đang tải diễn biến...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-red-700 font-bold">
        Lỗi tải diễn biến: {String((error as any)?.message || error)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="space-y-4">
            {notes.map((n) => {
              const tone = "bg-indigo-50 border-indigo-100 text-indigo-700"; // type = Bác sĩ

              return (
                <div key={n.id} className="flex gap-4">
                  {/* Dot + line */}
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-slate-900 mt-2" />
                    <div className="w-px flex-1 bg-slate-200 mt-2" />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 rounded-3xl border border-slate-200 p-5 hover:bg-slate-50 transition">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-2xl border ${tone}`}>
                          {n.type}
                        </span>
                        <div className="text-sm font-black text-slate-900">{n.author}</div>
                      </div>

                      <div className="text-xs font-bold text-slate-500 inline-flex items-center gap-2">
                        <i className="fa-regular fa-clock text-slate-400" />
                        {n.time ? new Date(n.time).toLocaleString("vi-VN") : "--"}
                      </div>
                    </div>

                    <div className="mt-3 text-slate-700 font-bold whitespace-pre-wrap leading-relaxed">
                      {n.content || "--"}
                    </div>
                  </div>
                </div>
              );
            })}

            {notes.length === 0 && (
              <div className="border border-dashed border-slate-200 rounded-3xl p-10 text-center text-slate-400 font-bold">
                Chưa có diễn biến trong lần khám này.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
