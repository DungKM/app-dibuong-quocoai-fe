import { CachDungJson, SlotKey } from "@/types/dibuong";

export const isInSlot = (cd: CachDungJson | undefined, slot: SlotKey) => {
    if (!cd) return false;
    if (slot === "SANG") return !!cd.ThoiGianSang;
    if (slot === "TRUA") return !!cd.ThoiGianTrua;
    if (slot === "CHIEU") return !!cd.ThoiGianChieu;
    return !!cd.ThoiGianToi;
}