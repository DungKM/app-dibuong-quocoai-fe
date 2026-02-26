import { DonThuocItem, ShiftStat, SlotKey } from "@/types/dibuong";
import { sameDate } from "./sameDate";
import { parseCachDung } from "./parseCachDung";

export const calcShiftStat = (
  items: DonThuocItem[], 
  slot: SlotKey, 
  selectedDate: string
): ShiftStat => {
  let total = 0;
  let used = 0;
  let returned = 0;

  for (const it of items) {
    // 1. Kiểm tra ngày (nếu có ngày kê thuốc)
    if (it.NgayKeThuoc && !sameDate(it.NgayKeThuoc, selectedDate)) continue;

    // 2. Bóc tách liều dùng từ chuỗi (sử dụng hàm bên trên)
    const dsCachDung = parseCachDung(it.LieuDung);
    console.log(dsCachDung);
    
    // 3. Kiểm tra xem thuốc có liều trong slot này không
    // SlotKey thường là: 'sang' | 'trua' | 'chieu' | 'toi' | 'dem'
    const hasDosageInSlot = dsCachDung.some(cd => {
      const dosage = (cd as any)[slot]; // Lấy giá trị theo key sáng/trưa/chiều...
      return dosage > 0;
    });

    if (hasDosageInSlot) {
      total += 1;
      const st = (it.TrangThai ?? "").trim().toLowerCase();
      
      // So khớp trạng thái (Hỗ trợ cả có dấu và không dấu nếu cần)
      if (st === "đã dùng thuốc" || st === "da dung thuoc") {
        used += 1;
      } else if (
        st === "đã hủy thuốc" || 
        st === "đã huỷ thuốc" || 
        st === "da huy thuoc"
      ) {
        returned += 1;
      }
    }
  }

  const pending = Math.max(0, total - used - returned);
  return { used, pending, returned };
};