import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getKetQuaDvktByPhieuKham } from "@/services/dibuong.api";
import type { KetQuaDvktItem } from "@/types/dibuong";

type Props = {
    idPhieuKham: string | null;
    baseFileUrl?: string;
};

type DocGroup = {
    title: string;
    files: { url: string; name: string }[];
};

function normalizePathToUrl(path: string | null | undefined, base: string) {
    if (!path) return "";

    const p = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return base.replace(/\/+$/, "") + "/" + p;
}

function fileNameFromUrl(url: string) {
    try {
        const u = new URL(url);
        const s = u.pathname.split("/").pop() || "file.pdf";
        return decodeURIComponent(s);
    } catch {
        const s = url.split("/").pop() || "file.pdf";
        return decodeURIComponent(s);
    }
}

export const KetQuaDvktBrowser: React.FC<Props> = ({
    idPhieuKham,
    baseFileUrl,
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const { data, isLoading, error } = useQuery<KetQuaDvktItem[]>({
        queryKey: ["ketqua_dvkt", idPhieuKham],
        enabled: !!idPhieuKham,
        queryFn: () => getKetQuaDvktByPhieuKham(idPhieuKham!),
    });

    const groups: DocGroup[] = useMemo(() => {
        const list = data ?? [];

        const map = new Map<string, { url: string; name: string }[]>();

        list.forEach((it) => {
            if (!map.has(it.TenDVKT)) map.set(it.TenDVKT, []);
            if (!it.LinkUrls || it.LinkUrls.trim() === "") return;

            const url = normalizePathToUrl(it.LinkUrls, baseFileUrl);
            if (!url) return;

            const name = fileNameFromUrl(url);

            const arr = map.get(it.TenDVKT)!;
            if (!arr.some((f) => f.url === url)) arr.push({ url, name });
        });

        return Array.from(map.entries()).map(([title, files]) => ({ title, files }));
    }, [data, baseFileUrl]);

    const safeIndex = Math.min(selectedIndex, Math.max(groups.length - 1, 0));
    const selected = groups[safeIndex];

    if (!idPhieuKham) {
        return (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 font-bold">
                Chọn một lần khám để xem hồ sơ/kết quả DVKT.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm text-center text-slate-400 font-bold">
                Đang tải hồ sơ...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-red-700 font-bold">
                Lỗi tải hồ sơ: {String((error as any)?.message || error)}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[500px]">
                {/* LEFT */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-4 max-h-[200px] md:max-h-full">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase">
                        Danh mục hồ sơ
                    </h3>

                    {groups.length === 0 ? (
                        <div className="text-sm text-slate-400 font-bold">
                            Chưa có kết quả DVKT.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            <li>
                                <div className="font-bold text-slate-700 text-sm mb-1">
                                    Hồ sơ bệnh án
                                </div>

                                <ul className="pl-4 border-l-2 border-slate-100 space-y-1">
                                    {groups.map((g, idx) => {
                                        const active = idx === safeIndex;
                                        return (
                                            <li
                                                key={`${g.title}-${idx}`}
                                                onClick={() => setSelectedIndex(idx)}
                                                className={[
                                                    "text-sm cursor-pointer px-2 py-1 rounded text-slate-600",
                                                    active ? "bg-blue-50 text-primary font-medium" : "hover:bg-slate-50",
                                                ].join(" ")}
                                            >
                                                <i className="fa-regular fa-folder mr-2" />
                                                {g.title}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        </ul>
                    )}
                </div>

                {/* RIGHT */}
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col min-h-[300px]">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <div className="min-w-0">
                            <div className="text-xs text-slate-500 mb-0.5">Danh mục đang chọn</div>
                            <h3 className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-none">
                                {selected?.title ?? "--"}
                            </h3>
                        </div>

                        <label className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-sky-600 transition flex items-center whitespace-nowrap">
                            <i className="fa-solid fa-camera mr-2" />
                            <span className="hidden sm:inline">Upload File</span>
                            <input type="file" className="hidden" />
                        </label>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="space-y-2">
                            {(selected?.files ?? []).map((f) => (
                                <div
                                    key={f.url}
                                    className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 bg-red-100 text-red-500 rounded flex flex-shrink-0 items-center justify-center">
                                            <i className="fa-solid fa-file-pdf" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                {f.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate">
                                                {f.url}
                                            </p>
                                        </div>
                                    </div>

                                    <a
                                        href={f.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-slate-400 hover:text-primary px-2"
                                        title="Tải xuống / mở file"
                                    >
                                        <i className="fa-solid fa-download" />
                                    </a>
                                </div>
                            ))}
                            {(selected?.files?.length ?? 0) === 0 && (
                                <div className="border border-dashed border-slate-200 rounded-3xl p-10 text-center text-slate-400 font-bold">
                                    Không có file kết quả trong danh mục này.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};