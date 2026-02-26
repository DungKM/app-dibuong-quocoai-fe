export const sameDate = (iso?: string | null, yyyyMmDd?: string) => {
    if (!iso || !yyyyMmDd) return false;
    return String(iso).slice(0, 10) === yyyyMmDd;
}
