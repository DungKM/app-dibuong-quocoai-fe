import type { CachDungJson } from "@/types/dibuong";
import { ShiftType, type SplitQty } from "@/types/dibuong";
import { getShiftByTime, SHIFT_LABELS } from "@/utils/shifts";

type TimeMention = {
  normalized: string;
  hour: number;
  minute: number;
  shift: ShiftType;
};

const COMPACT_TIME_REGEX =
  /\b([01]?\d|2[0-3])\s*(?:h|g|:)\s*([0-5]\d)(?:\s*(?:p|ph|phut|phút))?\b/gi;
const WORD_TIME_REGEX =
  /\b([01]?\d|2[0-3])\s*(?:gio|giờ)\s*([0-5]\d)(?:\s*(?:p|ph|phut|phút))?\b/gi;
const HOUR_ONLY_REGEX = /\b([01]?\d|2[0-3])\s*(?:h|g|gio|giờ)(?!\s*\d)\b/gi;
const TIME_RANGE_REGEX =
  /\b([01]?\d|2[0-3])\s*(?:h|g|:|gio|giờ)\s*([0-5]\d)?(?:\s*(?:p|ph|phut|phút))?\s*(?:-|–|—|~|đến|den|to)\s*([01]?\d|2[0-3])\s*(?:h|g|:|gio|giờ)\s*([0-5]\d)?(?:\s*(?:p|ph|phut|phút))?\b/gi;

const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, "0")}h${String(minute).padStart(2, "0")}`;

const shouldSkipMatch = (source: string, index: number) => {
  const prefix = source.slice(Math.max(0, index - 8), index).toLowerCase();
  return /\b(mỗi|moi|cách|cach)\s*$/.test(prefix);
};

const pushMatches = (source: string, regex: RegExp, out: TimeMention[]) => {
  regex.lastIndex = 0;

  for (const match of source.matchAll(regex)) {
    const [, hourRaw, minuteRaw] = match;
    const index = match.index ?? 0;
    if (shouldSkipMatch(source, index)) continue;

    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) continue;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;

    out.push({
      normalized: formatTime(hour, minute),
      hour,
      minute,
      shift: getShiftByTime(hour, minute),
    });
  }
};

const pushHourOnlyMatches = (source: string, regex: RegExp, out: TimeMention[]) => {
  regex.lastIndex = 0;

  for (const match of source.matchAll(regex)) {
    const [, hourRaw] = match;
    const index = match.index ?? 0;
    if (shouldSkipMatch(source, index)) continue;

    const hour = Number(hourRaw);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;

    out.push({
      normalized: formatTime(hour, 0),
      hour,
      minute: 0,
      shift: getShiftByTime(hour, 0),
    });
  }
};

export const extractExplicitTimes = (instruction?: string | null): TimeMention[] => {
  if (!instruction?.trim()) return [];

  const matches: TimeMention[] = [];
  pushMatches(instruction, COMPACT_TIME_REGEX, matches);
  pushMatches(instruction, WORD_TIME_REGEX, matches);
  pushHourOnlyMatches(instruction, HOUR_ONLY_REGEX, matches);

  const unique = new Map<string, TimeMention>();
  for (const item of matches) {
    const key = `${item.normalized}-${item.shift}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return Array.from(unique.values()).sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
};

const extractSameShiftRangeMentions = (instruction?: string | null): ShiftType[] => {
  if (!instruction?.trim()) return [];

  const shifts: ShiftType[] = [];
  TIME_RANGE_REGEX.lastIndex = 0;

  for (const match of instruction.matchAll(TIME_RANGE_REGEX)) {
    const [, startHourRaw, startMinuteRaw, endHourRaw, endMinuteRaw] = match;
    const index = match.index ?? 0;
    if (shouldSkipMatch(instruction, index)) continue;

    const startHour = Number(startHourRaw);
    const endHour = Number(endHourRaw);
    const startMinute = startMinuteRaw ? Number(startMinuteRaw) : 0;
    const endMinute = endMinuteRaw ? Number(endMinuteRaw) : 0;

    if (
      !Number.isInteger(startHour) ||
      !Number.isInteger(endHour) ||
      !Number.isInteger(startMinute) ||
      !Number.isInteger(endMinute)
    ) {
      continue;
    }

    if (
      startHour < 0 ||
      startHour > 23 ||
      endHour < 0 ||
      endHour > 23 ||
      startMinute < 0 ||
      startMinute > 59 ||
      endMinute < 0 ||
      endMinute > 59
    ) {
      continue;
    }

    const startShift = getShiftByTime(startHour, startMinute);
    const endShift = getShiftByTime(endHour, endMinute);

    if (startShift === endShift) {
      shifts.push(startShift);
    }
  }

  return shifts;
};

const createEmptySplits = (): SplitQty => ({
  MORNING: 0,
  NOON: 0,
  AFTERNOON: 0,
  NIGHT: 0,
});

const roundSplitValue = (value: number) => Math.round(value * 100) / 100;

const parseGhiChuLieuDung = (ghiChuLieuDung?: string | null): CachDungJson[] => {
  if (!ghiChuLieuDung) return [];

  try {
    const parsed = JSON.parse(ghiChuLieuDung);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const extractStructuredShifts = (ghiChuLieuDung?: string | null): ShiftType[] => {
  const first = parseGhiChuLieuDung(ghiChuLieuDung)[0];
  if (!first) return [];

  const shifts: ShiftType[] = [];
  if (first.ThoiGianSang?.trim()) shifts.push(ShiftType.MORNING);
  if (first.ThoiGianTrua?.trim()) shifts.push(ShiftType.NOON);
  if (first.ThoiGianChieu?.trim()) shifts.push(ShiftType.AFTERNOON);
  if (first.ThoiGianToi?.trim()) shifts.push(ShiftType.NIGHT);

  return shifts;
};

export const buildDeterministicSplitsFromInstruction = (
  lieuDung?: string | null,
  ghiChuLieuDung?: string | null,
  maxQty?: number | null
): SplitQty | null => {
  const safeMaxQty = Number(maxQty ?? 0);
  if (!(safeMaxQty > 0)) return null;

  const normalizedInstruction = lieuDung?.trim() ?? "";
  const sameShiftRangeMentions = extractSameShiftRangeMentions(normalizedInstruction);
  const explicitTimes = extractExplicitTimes(normalizedInstruction);
  const shiftMentions = sameShiftRangeMentions.length
    ? sameShiftRangeMentions
    : explicitTimes.length
      ? explicitTimes.map((item) => item.shift)
      : extractStructuredShifts(ghiChuLieuDung);

  if (!shiftMentions.length) return null;

  const counts = createEmptySplits();
  for (const shift of shiftMentions) {
    counts[shift] += 1;
  }

  const unitQty = safeMaxQty / shiftMentions.length;
  const splits = createEmptySplits();
  (Object.keys(counts) as Array<keyof SplitQty>).forEach((key) => {
    if (counts[key] > 0) {
      splits[key] = roundSplitValue(counts[key] * unitQty);
    }
  });

  const totalAssigned = splits.MORNING + splits.NOON + splits.AFTERNOON + splits.NIGHT;
  const diff = roundSplitValue(safeMaxQty - totalAssigned);

  if (Math.abs(diff) > 0.000001) {
    const lastShift = shiftMentions[shiftMentions.length - 1];
    splits[lastShift] = roundSplitValue(Math.max(0, splits[lastShift] + diff));
  }

  return splits;
};

const buildStructuredTimeHints = (ghiChuLieuDung?: string | null) => {
  const first = parseGhiChuLieuDung(ghiChuLieuDung)[0];
  if (!first) return [];

  const fieldMap: Array<[string, string | undefined]> = [
    ["Sáng", first.ThoiGianSang],
    ["Trưa", first.ThoiGianTrua],
    ["Chiều", first.ThoiGianChieu],
    ["Đêm", first.ThoiGianToi],
  ];

  return fieldMap
    .filter(([, value]) => !!value?.trim())
    .map(([label, value]) => `${label}: ${value!.trim()}`);
};

const buildTimeHintText = (times: TimeMention[]) => {
  if (!times.length) return "";

  return times.map((item) => `${item.normalized} -> ca ${SHIFT_LABELS[item.shift]}`).join("; ");
};

const buildAutoSplitHintBlock = (times: TimeMention[], maxQty: number) => {
  const parts: string[] = [];

  if (maxQty > 0) {
    parts.push(`max_total=${maxQty}`);
  }

  parts.push("allow_decimal_split=true");
  parts.push("require_sum_lte_max_total=true");
  parts.push("require_all_4_shifts=false");

  if (times.length) {
    const mappedTimes = times.map((item) => `${item.normalized}:${item.shift}`).join(",");
    parts.push(`explicit_times=${mappedTimes}`);
    parts.push(`explicit_time_count=${times.length}`);
    parts.push("only_use_explicit_times_when_present=true");

    if (maxQty > 0 && times.length > 1 && maxQty < times.length) {
      parts.push("if_max_total_less_than_explicit_time_count_then_fractional_split_is_allowed=true");
      parts.push("do_not_round_up_each_time_to_1=true");
    }
  } else {
    parts.push("infer_reasonable_number_of_shifts_from_instruction=true");
  }

  return `[AUTO_SPLIT_HINT ${parts.join("; ")}]`;
};

export const buildSmartMedicationInstruction = (
  lieuDung?: string | null,
  ghiChuLieuDung?: string | null,
  maxQty?: number | null
) => {
  const rawInstruction = lieuDung?.trim() ?? "";
  const explicitTimes = extractExplicitTimes(rawInstruction);
  const structuredHints = explicitTimes.length > 0 ? [] : buildStructuredTimeHints(ghiChuLieuDung);
  const timeHintText = buildTimeHintText(explicitTimes);
  const safeMaxQty = Number(maxQty ?? 0);

  if (!rawInstruction && !structuredHints.length) return "";

  const segments: string[] = [];

  if (rawInstruction) {
    segments.push(`Liều dùng gốc: ${rawInstruction}.`);
  }

  segments.push(buildAutoSplitHintBlock(explicitTimes, safeMaxQty));

  if (timeHintText) {
    segments.push(`Thời điểm nhận diện được: ${timeHintText}.`);
  } else if (structuredHints.length) {
    segments.push(`Dữ liệu kê thuốc cấu trúc: ${structuredHints.join("; ")}.`);
  }

  segments.push("Quy ước ca: Sáng 00:00-11:29, Trưa 11:30-12:59, Chiều 13:00-16:59, Đêm 17:00-23:59.");
  segments.push("Không bắt buộc phải chia đủ 4 ca. Chỉ chia vào những ca thực sự có thông tin thời điểm hoặc tần suất phù hợp.");
  segments.push("Nếu không có đủ thông tin giờ dùng cụ thể thì AI tự suy luận số ca hợp lý từ liều dùng, không được tự ép thành 4 ca.");
  segments.push("Nếu tổng số lượng nhỏ hơn số lần dùng hoặc số mốc giờ nhận diện được, được phép chia số thập phân.");

  if (safeMaxQty > 0) {
    segments.push(`Tổng số lượng đã chia ở tất cả các ca không được vượt quá ${safeMaxQty}.`);
  }

  return segments.join(" | ");
};
