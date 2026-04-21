import { ShiftType } from "@/types/dibuong";

export const SHIFT_OPTIONS = [
  { id: ShiftType.MORNING, label: "Sáng", icon: "fa-sun", timeRange: "0h01 - 11h30" },
  { id: ShiftType.NOON, label: "Trưa", icon: "fa-cloud-sun", timeRange: "11h31 - 14h" },
  { id: ShiftType.AFTERNOON, label: "Chiều", icon: "fa-cloud", timeRange: "14h01 - 18h30" },
  { id: ShiftType.NIGHT, label: "Đêm", icon: "fa-moon", timeRange: "18h31 - 24h" },
] as const;

export const SHIFT_LABELS: Record<ShiftType, string> = {
  [ShiftType.MORNING]: "Sáng",
  [ShiftType.NOON]: "Trưa",
  [ShiftType.AFTERNOON]: "Chiều",
  [ShiftType.NIGHT]: "Đêm",
};

export const getShiftByTime = (hour: number, minute = 0): ShiftType => {
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return ShiftType.MORNING;

  if (hour === 24) return ShiftType.NIGHT;

  if (hour < 11 || (hour === 11 && minute <= 30)) return ShiftType.MORNING;
  if (hour < 14 || (hour === 14 && minute === 0)) return ShiftType.NOON;
  if (hour < 18 || (hour === 18 && minute <= 30)) return ShiftType.AFTERNOON;
  return ShiftType.NIGHT;
};

export const getCurrentShift = (date: Date = new Date()): ShiftType => {
  return getShiftByTime(date.getHours(), date.getMinutes());
};
