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

async function fetchPdfAsBlobUrl(url: string, token?: string) {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, { method: "GET", headers });

    if (res.status === 404) {
        const err = new Error("File không tồn tại hoặc đã bị xoá.");
        (err as any).status = 404;
        throw err;
    }

    if (!res.ok) {
        const err = new Error(`Không tải được PDF (HTTP ${res.status}).`);
        (err as any).status = res.status;
        throw err;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("pdf")) {
        const err = new Error("Link trả về không phải PDF (có thể cần đăng nhập).");
        (err as any).status = 415;
        throw err;
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

export const KetQuaDvktBrowser: React.FC<Props> = ({
    idPhieuKham,
    baseFileUrl = "",
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewName, setPreviewName] = useState<string>("");
    const [previewLoading, setPreviewLoading] = useState(false);

    // để cleanup object url
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

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

    if (!idPhieuKham) return <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">Chọn một lần khám để xem hồ sơ.</div>;
    if (isLoading) return <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">Đang tải hồ sơ...</div>;
    if (error) return <div className="p-6 bg-red-50 rounded-3xl border border-red-100 text-red-700 font-bold font-bold">Lỗi tải hồ sơ.</div>;

    const TOKEN = import.meta.env.VITE_API_TOKEN as string;

    const openPreview = async (url: string) => {
        setPreviewLoading(true);

        try {
            // cleanup objectUrl cũ
            if (objectUrl) URL.revokeObjectURL(objectUrl);

            const TOKEN = import.meta.env.VITE_API_TOKEN as string; // hoặc token user
            const blobUrl = await fetchPdfAsBlobUrl(url, TOKEN);

            setObjectUrl(blobUrl);
            setPreviewUrl(blobUrl);
            setPreviewName(fileNameFromUrl(url));
        } catch (e: any) {
            console.error(e);

            // ✅ thông báo gọn cho 404
            if (e?.status === 404) {
                alert("File không tồn tại hoặc đã bị xoá.");
            } else {
                alert(e?.message || "Không mở được PDF.");
            }

            // ✅ đảm bảo không mở modal khi lỗi
            setPreviewUrl(null);
            setPreviewName("");
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
        setPreviewUrl(null);
        setPreviewName("");
        setPreviewLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[500px]">
                {/* LEFT: Danh mục */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-4 max-h-[200px] md:max-h-full">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase">Danh mục hồ sơ</h3>
                    {groups.length === 0 ? (
                        <div className="text-sm text-slate-400 font-bold">Chưa có kết quả.</div>
                    ) : (
                        <ul className="space-y-1">
                            {groups.map((g, idx) => (
                                <li
                                    key={`${g.title}-${idx}`}
                                    onClick={() => setSelectedIndex(idx)}
                                    className={`text-sm cursor-pointer px-3 py-2 rounded-lg transition ${idx === safeIndex ? "bg-blue-50 text-primary font-bold" : "hover:bg-slate-50 text-slate-600"
                                        }`}
                                >
                                    <i className="fa-regular fa-folder mr-2" />
                                    {g.title}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* RIGHT: Danh sách File */}
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col min-h-[300px]">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-3">{selected?.title ?? "--"}</h3>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {(selected?.files ?? []).map((f) => (
                            <div
                                key={f.url}
                                onClick={() => openPreview(f.url)}
                                className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition group"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex flex-shrink-0 items-center justify-center text-lg">
                                        <i className="fa-solid fa-file-pdf" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{f.name}</p>
                                        <p className="text-[10px] text-slate-400 truncate tracking-tight">{f.url}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="text-slate-400 group-hover:text-primary p-2">
                                        <i className="fa-solid fa-eye" />
                                    </button>
                                    <a
                                        href={f.url}
                                        download
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-slate-400 hover:text-green-600 p-2"
                                    >
                                        <i className="fa-solid fa-download" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAL POPUP XEM PDF */}
            {previewUrl && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-10">
                    <div className="bg-white w-full h-full max-w-6xl rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                        {/* Header của Popup */}
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <i className="fa-solid fa-file-pdf text-red-500 text-xl" />
                                <span className="font-bold text-slate-800 truncate max-w-md">
                                    {previewName}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewUrl ?? undefined}
                                    target="_blank"
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                                    rel="noreferrer"
                                >
                                    Mở tab mới
                                </a>
                                <button
                                    onClick={closePreview}
                                    className="w-10 h-10 flex items-center justify-center bg-slate-200 hover:bg-red-500 hover:text-white rounded-full transition"
                                >
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-100">
                            {previewLoading ? (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold">
                                    Đang tải PDF...
                                </div>
                            ) : (
                                previewUrl && (
                                    <iframe
                                        src={`${previewUrl}#toolbar=0`}
                                        className="w-full h-full"
                                        title="PDF Preview"
                                    />
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};