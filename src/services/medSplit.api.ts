import { requestNode } from "./http.node";

export type SplitQty = {
  MORNING: number;
  NOON: number;
  AFTERNOON: number;
  NIGHT: number;
};

export type MedSplitsResponse = {
  idPhieuKham: string;
  splits: Record<string, SplitQty>;
};

export const ZERO: SplitQty = { 
  MORNING: 0, 
  NOON: 0, 
  AFTERNOON: 0, 
  NIGHT: 0 
};

export function getMedSplitsByEncounter(idPhieuKham: string) {
  return requestNode<MedSplitsResponse>(`/api/encounters/${idPhieuKham}/med-splits`, {
    method: "GET",
  });
}

export function saveMedSplitOne(idPhieuKham: string, idPhieuThuoc: string, splits: SplitQty) {
  return requestNode<any>(`/api/encounters/${idPhieuKham}/med-splits/${idPhieuThuoc}`, {
    method: "PUT",
    body: { splits },
  });
}

export function saveMedSplitBatch(
  idPhieuKham: string,
  items: { idPhieuThuoc: string; splits: SplitQty }[]
) {
  return requestNode<any>(`/api/encounters/${idPhieuKham}/med-splits`, {
    method: "PUT",
    body: { items },
  });
}
