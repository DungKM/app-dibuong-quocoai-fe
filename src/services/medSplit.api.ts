import { requestNode } from "./http.node";
import type { SplitQty } from "@/types/dibuong";

export interface MedSplitsResponse {
    idPhieuKham: string;
    splits: Record<string, SplitQty>;
}

export const ZERO: SplitQty = { MORNING: 0, NOON: 0, AFTERNOON: 0, NIGHT: 0 };

export function getMedSplitsByEncounter(idPhieuKham: string) {
    return requestNode<MedSplitsResponse>(`/api/encounters/${idPhieuKham}/med-splits`);
}

export function saveMedSplitOne(idPhieuKham: string, idPhieuThuoc: string, splits: SplitQty) {
    return requestNode<any>(`/api/encounters/${idPhieuKham}/med-splits/${idPhieuThuoc}`, {
        method: "PUT",
        body: { splits }
    });
}

export function confirmMedUsage(idPhieuKham: string, idPhieuThuoc: string) {
    return requestNode(`/api/encounters/${idPhieuKham}/med-splits/${idPhieuThuoc}/confirm`, {
        method: "PATCH"
    });
}

export function returnMedication(idPhieuKham: string, idPhieuThuoc: string, data: { quantity: number; reason: string }) {
    return requestNode(`/api/encounters/${idPhieuKham}/med-splits/${idPhieuThuoc}/return`, {
        method: "PATCH",
        body: data
    });
}