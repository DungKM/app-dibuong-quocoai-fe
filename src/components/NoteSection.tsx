import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNote, getNotes } from "@/services/note.api";
import dayjs from "dayjs";
import { NoteItem } from "@/types/note";

export const NoteSection: React.FC<{ idPhieuKham: string }> = ({ idPhieuKham }) => {
    const [content, setContent] = useState("");
    const qc = useQueryClient();

    const { data: notes } = useQuery<NoteItem[]>({
        queryKey: ["notes", idPhieuKham],
        queryFn: () => getNotes(idPhieuKham),
    });

    const createMutation = useMutation({
        mutationFn: (text: string) => createNote(idPhieuKham, text),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notes", idPhieuKham] });
            setContent("");
        },
    });

    return (
        <div className="space-y-6">

            {/* Box nhập note */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Nhập ghi chú điều trị, diễn biến, y lệnh..."
                    className="w-full min-h-[100px] border border-slate-200 rounded-2xl p-4 outline-none focus:border-primary"
                />
                <button
                    onClick={() => content.trim() && createMutation.mutate(content)}
                    className="mt-4 px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase disabled:opacity-40"
                    disabled={!content.trim()}
                >
                    Lưu ghi chú
                </button>
            </div>

            {/* Danh sách note */}
            <div className="space-y-4">
                {notes?.length === 0 && (
                    <div className="text-center text-slate-400 text-sm font-bold">
                        Chưa có ghi chú
                    </div>
                )}

                {notes?.map((n: any) => (
                    <div key={n._id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                        <div className="text-xs text-slate-400 font-bold uppercase">
                            @{n.createdBy?.username}
                        </div>
                        <div className="text-sm text-slate-800 mt-2 whitespace-pre-wrap">
                            {n.content}
                        </div>
                        <div className="text-[10px] text-slate-300 mt-3 font-bold">
                            {dayjs(n.createdAt).format("HH:mm DD/MM/YYYY")}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};