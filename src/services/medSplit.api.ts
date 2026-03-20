import { requestNode } from "./http.node";
import type { SplitQty } from "@/types/dibuong";

export interface ReturnHistoryItem {
  quantity: number;
  reason: string;
  status?: string;
  returnedAt?: string;
  returnedBy?: string;
}

export interface MedSplitItem {
  splits: SplitQty;
  status?: string;
  splitSource?: "MANUAL" | "RULE" | "AI";
  confidence?: number;
  needsReview?: boolean;
  reason?: string | null;
  rawInstruction?: string | null;
  parsedInstruction?: any;
  returnHistory?: ReturnHistoryItem[];
}

export interface MedSplitsResponse {
  idPhieuKham: string;
  splits: Record<string, MedSplitItem>;
}

export interface AutoSplitInputItem {
  idPhieuThuoc: string;
  tenThuoc: string;
  lieuDung: string;
  maxQty: number;
}

export interface AutoSplitResponse {
  ok: boolean;
  summary: {
    total: number;
    autoSuccess: number;
    needsReview: number;
    failed: number;
    skippedManual: number;
  };
}

export function getMedSplitsByEncounter(idPhieuKham: string) {
  return requestNode<MedSplitsResponse>(`/api/encounters/${idPhieuKham}/med-splits`);
}

export function saveMedSplitOne(
  idPhieuKham: string,
  idPhieuThuoc: string,
  splits: SplitQty
) {
  return requestNode<any>(`/api/encounters/${idPhieuKham}/med-splits/${idPhieuThuoc}`, {
    method: "PUT",
    body: { splits },
  });
}

export function autoSplitAllMeds(
  idPhieuKham: string,
  items: AutoSplitInputItem[]
) {
  return requestNode<AutoSplitResponse>(
    `/api/encounters/${idPhieuKham}/med-splits/auto-split`,
    {
      method: "POST",
      body: { items },
    }
  );
}

export function confirmMedUsage(idPhieuKham: string, idPhieuThuoc: string) {
  return requestNode(`/api/encounters/${idPhieuKham}/med-splits/${idPhieuThuoc}/confirm`, {
    method: "PATCH",
  });
}

export function returnMedication(
  idPhieuKham: string,
  idPhieuThuoc: string,
  data: {
    quantity: number;
    reason: string;
    tenBenhNhan: string;
    maBenhNhan: string;
    tenThuoc: string;
    idBenhAn: string;
  }
) {
  return requestNode(
    `/api/encounters/${idPhieuKham}/med-splits/${idPhieuThuoc}/return`,
    {
      method: "PATCH",
      body: data,
    }
  );
}