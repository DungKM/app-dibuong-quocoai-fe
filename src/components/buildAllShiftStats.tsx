import { DonThuocItem, ShiftStat, ShiftType } from "@/types/dibuong";
import { calcShiftStat } from "./calcShiftStat";

export const buildAllShiftStats = (items: DonThuocItem[], selectedDate: string): Record<ShiftType, ShiftStat> => {
    return {
        [ShiftType.MORNING]: calcShiftStat(items, "SANG", selectedDate),
        [ShiftType.NOON]: calcShiftStat(items, "TRUA", selectedDate),
        [ShiftType.AFTERNOON]: calcShiftStat(items, "CHIEU", selectedDate),
        [ShiftType.NIGHT]: calcShiftStat(items, "TOI", selectedDate),
    };
}
