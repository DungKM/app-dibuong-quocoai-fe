// buildAdvancedShiftStats.ts
export function buildAdvancedShiftStats(meds: any[], splits: any) {
  const shifts: any = {
    MORNING: { used: 0, pending: 0, returned: 0, total: 0 },
    NOON: { used: 0, pending: 0, returned: 0, total: 0 },
    AFTERNOON: { used: 0, pending: 0, returned: 0, total: 0 },
    NIGHT: { used: 0, pending: 0, returned: 0, total: 0 },
  };

  const shiftKeys = ["MORNING", "NOON", "AFTERNOON", "NIGHT"] as const;

  meds.forEach((m) => {
    const id = String(m.IdPhieuThuoc);
    const info = splits[id];

    shiftKeys.forEach((k) => {
      const qtyInShift = Number(info?.splits?.[k] ?? 0);
      
      if (qtyInShift > 0) {
        shifts[k].total += qtyInShift;

        if (info?.status === "Đã dùng thuốc") {
          shifts[k].used += qtyInShift;
        } else {
          const ret = info?.returnHistory?.reduce((s: number, h: any) => s + Number(h.quantity || 0), 0) ?? 0;
          shifts[k].returned += ret;
          shifts[k].pending += Math.max(0, qtyInShift - ret);
        }
      }
    });
  });

  return shifts;
}