import { DonThuocItem, ShiftStat, SlotKey } from "@/types/dibuong";
import { sameDate } from "./sameDate";
import { parseCachDung } from "./parseCachDung";
import { isInSlot } from "./isInSlot";

export const calcShiftStat = (items: DonThuocItem[], slot: SlotKey, selectedDate: string): ShiftStat => {
    let total = 0;
    let used = 0;
    let returned = 0;
    for (const it of items) {
        if (it.NgayKeThuoc && !sameDate(it.NgayKeThuoc, selectedDate)) continue;
        const cd = parseCachDung(it.GhiChuLieuDung)?.[0];
        if (!isInSlot(cd, slot)) continue;
        total += 1;
        const st = (it.TrangThai ?? "").trim();
        if (st === "Đã dùng thuốc") used += 1;
        if (st === "Đã hủy thuốc" || st === "Đã huỷ thuốc") returned += 1;
    }
    const pending = Math.max(0, total - used - returned);
    return { used, pending, returned };
}