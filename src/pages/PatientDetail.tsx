
import { DvktList } from '@/components/DvktList';
import { VitalsTable } from '@/components/VitalsTable';
import { EncounterList } from '@/components/EncounterList';
import { MedicationList } from '@/components/MedicationList';
import { SignatureCapture } from '@/components/SignatureCapture';
import { ThongTinVaoVienCard } from '@/components/ThongTinVaoVienCard';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { EncounterTimeline } from '@/components/EncounterTimeline';
import { KetQuaDvktBrowser } from '@/components/KetQuaDvktBrowser';
import { env } from '@/config/env';
import { NoteSection } from '@/components/NoteSection';
import { AIAssistant } from '@/components/AIAssistant';
import { ThongTinVaoVienItem } from '@/types/dibuong';
import { getThongTinVaoVien } from '@/services/dibuong.api';

export const PatientDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { search } = useLocation();

    const qs = new URLSearchParams(search);
    const maBenhNhan = qs.get("maBenhNhan") ?? "";
    const tenBenhNhan = qs.get("tenBenhNhan") ?? "";
    const aiQuestion = qs.get("aiQuestion") ?? "";

    const IdBenhAn = id ?? "";
    const navigate = useNavigate();
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'record' | 'vitals' | 'meds' | 'services' | 'notes'>('record');
    const [showSignature, setShowSignature] = useState<{ orderId: string, type: 'MED' | 'SERVICE' } | null>(null);


    const [item, setItem] = useState<ThongTinVaoVienItem | null>(null);

    useEffect(() => {
        if (!IdBenhAn?.trim()) return;
        getThongTinVaoVien(IdBenhAn.trim()).then((res) => setItem(res[0] ?? null));
    }, [IdBenhAn]);

    return (
        <div className="pb-20 relative">
            <AIAssistant
                patientName={tenBenhNhan}
                notes={item?.notes}
                benhAnInfo={{
                    lyDoVaoVien: item?.LyDoVaoVien,
                    dienBienBenh: item?.DienBienBenh,
                    tienSuBenh: item?.TienSuBenh,
                    tienSuBenhGiaDinh: item?.TienSuBenhGiaDinh,
                    chanDoan: item?.ChanDoan,
                    huongDieuTri: item?.HuongDieuTri,
                }}
                initialQuestion={aiQuestion}
                dataReady={!!(item && (
                    item.LyDoVaoVien ||
                    item.DienBienBenh ||
                    item.TienSuBenh ||
                    item.TienSuBenhGiaDinh ||
                    item.ChanDoan ||
                    item.HuongDieuTri ||
                    (item.notes && item.notes.length > 0)
                ))}
            />

            {showSignature && <SignatureCapture title="Xác nhận" onSave={() => setShowSignature(null)} onCancel={() => setShowSignature(null)} />}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-6 sticky top-16 sm:top-20 z-30">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition">
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                {tenBenhNhan}
                            </h1>
                            <div className="text-sm text-slate-500 font-medium flex gap-4 mt-1">
                                <span>Mã BN: <span className="text-slate-900 font-bold">{maBenhNhan}</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-1 mb-8 border-b border-slate-200 pb-1 scrollbar-hide">
                {[
                    { id: 'record', label: 'Bệnh án', icon: 'fa-file-medical' },
                    { id: 'services', label: 'CLS/DVKT', icon: 'fa-microscope' },
                    { id: 'meds', label: 'Dùng thuốc', icon: 'fa-pills' },
                    { id: 'vitals', label: 'Sinh hiệu', icon: 'fa-heart-pulse' },
                    { id: 'notes', label: 'Diễn biến', icon: 'fa-clipboard-user' },
                    { id: 'documents', label: 'Tài liệu', icon: 'fa-book' },
                    { id: 'loadnote', label: 'Ghi chú', icon: 'fa-sticky-note' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                    >
                        <i className={`fa-solid ${tab.icon}`}></i>
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeTab !== "record" && activeTab !== "history" && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lần khám có chỉ định CLS/DVKT</div>
                            <div className="text-slate-900 font-black mt-1">Chọn lần khám để xem chỉ định</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
                                <i className="fa-solid fa-filter text-slate-400 text-xs"></i>
                                <select className="bg-transparent text-xs font-black text-slate-700 outline-none">
                                    <option>Tất cả loại</option>
                                    <option>LAB</option>
                                    <option>CĐHA</option>
                                    <option>DVKT</option>
                                </select>
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <select className="bg-transparent text-xs font-black text-slate-700 outline-none">
                                    <option>Tất cả trạng thái</option>
                                    <option>Chờ thực hiện</option>
                                    <option>Đang thực hiện</option>
                                    <option>Có kết quả</option>
                                    <option>Đã hủy</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <EncounterList
                        idBenhAn={IdBenhAn}
                        selectedEncounterId={selectedEncounterId}
                        onChangeSelected={setSelectedEncounterId}
                        mode="all"
                    />
                </div>
            )
            }
            {/* OTHER TABS (Placeholder/Existing) */}
            {activeTab === 'record' && (
                <ThongTinVaoVienCard idBenhAn={IdBenhAn} />
            )}
            {/* TAB CONTENT: VITALS WITH TRENDS */}
            {activeTab === 'vitals' && (
                <VitalsTable idPhieuKham={selectedEncounterId} />
            )}
            {/* TAB CONTENT: CLS/DVKT */}
            {activeTab === 'services' && (
                <DvktList idPhieuKham={selectedEncounterId} />
            )}
            {/* TAB CONTENT: meds */}
            {activeTab === 'meds' && (
                <MedicationList idPhieuKham={selectedEncounterId} />
            )}
            {/* OTHER TABS Notes */}
            {activeTab === 'notes' && (
                <EncounterTimeline idPhieuKham={selectedEncounterId} />
            )}
            {/* OTHER TABS Documents */}
            {activeTab === "documents" && (
                <KetQuaDvktBrowser idPhieuKham={selectedEncounterId} baseFileUrl={env.API_BASE_URL} />
            )}
            {/* OTHER TABS loadnote */}
            {activeTab === 'loadnote' && (
                <NoteSection idPhieuKham={selectedEncounterId} />
            )}
        </div>
    );
};
