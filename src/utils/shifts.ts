import { ShiftType } from "@/types/dibuong";

export const SHIFT_OPTIONS = [
  { id: ShiftType.MORNING, label: "Sáng", icon: "fa-sun", timeRange: "0h - 11h30" },
  { id: ShiftType.NOON, label: "Trưa", icon: "fa-cloud-sun", timeRange: "11h30 - 13h" },
  { id: ShiftType.AFTERNOON, label: "Chiều", icon: "fa-cloud", timeRange: "13h - 17h" },
  { id: ShiftType.NIGHT, label: "Đêm", icon: "fa-moon", timeRange: "17h - 23:59" },
] as const;

export const SHIFT_LABELS: Record<ShiftType, string> = {
  [ShiftType.MORNING]: "Sáng",
  [ShiftType.NOON]: "Trưa",
  [ShiftType.AFTERNOON]: "Chiều",
  [ShiftType.NIGHT]: "Đêm",
};

export const getShiftByTime = (hour: number, minute = 0): ShiftType => {
  if (hour < 11 || (hour === 11 && minute < 30)) return ShiftType.MORNING;
  if (hour < 13) return ShiftType.NOON;
  if (hour < 17) return ShiftType.AFTERNOON;
  return ShiftType.NIGHT;
};

export const getCurrentShift = (date: Date = new Date()): ShiftType => {
  return getShiftByTime(date.getHours(), date.getMinutes());
};
