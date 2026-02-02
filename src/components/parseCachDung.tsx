import { CachDungJson } from "@/types/dibuong";

export const parseCachDung = (ghiChuJson?: string | null): CachDungJson[] => {
    if (!ghiChuJson) return [];
    try {
        const x = JSON.parse(ghiChuJson);
        return Array.isArray(x) ? x : [];
    } catch {
        return [];
    }
}