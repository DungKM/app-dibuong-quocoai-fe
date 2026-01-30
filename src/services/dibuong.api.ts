import { request } from "./http";
import type { ThongTinVaoVienResponse, BuongPhongResponse, LanKhamItem, SinhHieuItem, DvktItem, DonThuocItem, DienBienItem, KetQuaDvktItem } from "../types/dibuong";

export function getThongTinVaoVien(idBenhAn: string) {
  return request<ThongTinVaoVienResponse>("/async/api/dibuong/thongtinvaovien", {
    method: "GET",
    query: { IdBenhAn: idBenhAn },
  });
}

export function getBuongPhong(idKhoa: string) {
  return request<BuongPhongResponse>("/async/api/dibuong/buongphong", {
    method: "GET",
    query: { IdKhoa: idKhoa },
  });
}

export function getDsLanKham(idBenhAn: string) {
  return request<LanKhamItem[]>("/async/api/dibuong/dslankham", {
    method: "GET",
    query: { IdBenhAn: idBenhAn },
  });
}

export function getSinhHieuByPhieuKham(idPhieuKham: string) {
  return request<SinhHieuItem[]>("/async/api/dibuong/ds_sinhhieu", {
    method: "GET",
    query: { IdPhieuKham: idPhieuKham },
  });
}

export function getDvktByPhieuKham(idPhieuKham: string) {
  return request<DvktItem[]>("/async/api/dibuong/ds_dvkt", {
    method: "GET",
    query: { IdPhieuKham: idPhieuKham },
  });
}

export function getDonThuocByPhieuKham(idPhieuKham: string) {
  return request<DonThuocItem[]>("/async/api/dibuong/ds_donthuoc", {
    method: "GET",
    query: { IdPhieuKham: idPhieuKham },
  });
}

export function getDienBienByPhieuKham(idPhieuKham: string) {
  return request<DienBienItem[]>("/async/api/dibuong/ds_dienbien", {
    method: "GET",
    query: { IdPhieuKham: idPhieuKham },
  });
}

export function getKetQuaDvktByPhieuKham(idPhieuKham: string) {
  return request<KetQuaDvktItem[]>("/async/api/dibuong/ds_ketqua_dvkt", {
    method: "GET",
    query: { IdPhieuKham: idPhieuKham },
  });
}