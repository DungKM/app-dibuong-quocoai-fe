
import { api } from '@/services/api';
import { aiService } from '@/services/ai';
import { useQuery } from '@tanstack/react-query';
import { DvktList } from '@/components/DvktList';
import { VitalsTable } from '@/components/VitalsTable';
import { EncounterList } from '@/components/EncounterList';
import { MedicationList } from '@/components/MedicationList';
import { SignatureCapture } from '@/components/SignatureCapture';
import { ThongTinVaoVienCard } from '@/components/ThongTinVaoVienCard';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useMemo, useEffect } from 'react';
import { AIAssistant } from '@/components/AIAssistant';
import { EncounterTimeline } from '@/components/EncounterTimeline';
import { KetQuaDvktBrowser } from '@/components/KetQuaDvktBrowser';
import { env } from '@/config/env';

export const PatientDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { search } = useLocation();

    const qs = new URLSearchParams(search);
    const maBenhNhan = qs.get("maBenhNhan") ?? "";
    const tenBenhNhan = qs.get("tenBenhNhan") ?? "";

    const IdBenhAn = id ?? "";
    const navigate = useNavigate();
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'record' | 'vitals' | 'meds' | 'services' | 'notes'>('record');
    const [showSignature, setShowSignature] = useState<{ orderId: string, type: 'MED' | 'SERVICE' } | null>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);

    const { data: patient, isLoading: pLoading } = useQuery({ queryKey: ['patient', id], queryFn: () => api.getPatientById(id!), enabled: !!id });
    const { data: record } = useQuery({ queryKey: ['record', id], queryFn: () => api.getMedicalRecord(id!), enabled: !!id });
    const { data: vitals } = useQuery({ queryKey: ['vitals', id], queryFn: () => api.getVitals(id!), enabled: !!id });
    const { data: orders } = useQuery({ queryKey: ['orders', id], queryFn: () => api.getOrders(id!), enabled: !!id });
    const { data: notes } = useQuery({ queryKey: ['notes', id], queryFn: () => api.getNotes(id!), enabled: !!id });

    // AI Briefing
    useEffect(() => {
        if (patient && record && vitals) {
            aiService.getClinicalSummary({ patient, record, vitals, orders, notes }).then(setAiSummary);
        }
    }, [patient?.id]);

    const vitalsByEncounter = useMemo(() => {
        const list = vitals ?? [];
        const groups = new Map<string, {
            encounterId: string;
            encounterCode?: string;
            encounterDate?: string;
            doctorName?: string;
            items: typeof list;
        }>();

        for (const v of list) {
            const key = (v as any).encounterId || (v as any).encounterCode || 'UNKNOWN';

            if (!groups.has(key)) {
                groups.set(key, {
                    encounterId: (v as any).encounterId ?? key,
                    encounterCode: (v as any).encounterCode,
                    encounterDate: (v as any).encounterDate || (v as any).encounterCreatedAt,
                    doctorName: (v as any).doctorName,
                    items: [],
                });
            }
            groups.get(key)!.items.push(v);
        }

        // sort items trong từng lần (mới nhất trước)
        const result = Array.from(groups.values()).map(g => ({
            ...g,
            items: [...g.items].sort((a: any, b: any) => +new Date(b.timestamp) - +new Date(a.timestamp)),
        }));

        // sort các lần khám (mới nhất trước) theo encounterDate nếu có, fallback theo timestamp mới nhất
        result.sort((a, b) => {
            const ad = a.encounterDate ? +new Date(a.encounterDate) : +new Date((a.items[0] as any).timestamp);
            const bd = b.encounterDate ? +new Date(b.encounterDate) : +new Date((b.items[0] as any).timestamp);
            return bd - ad;
        });

        return result;
    }, [vitals]);

    //   const addVitalMutation = useMutation({
    //     mutationFn: (data: z.infer<typeof vitalSchema>) => api.createVital({ id: Math.random().toString(), patientId: id!, timestamp: new Date().toISOString(), creatorId: currentUser!.id, ...data }),
    //     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vitals', id] }); resetVital(); }
    //   });

    if (pLoading) return <div className="text-center py-20"><i className="fa-solid fa-circle-notch fa-spin text-3xl text-primary"></i></div>;

    return (
        <div className="pb-20 relative">
            {/* <AIAssistant patient={patient} record={record} vitals={vitals} orders={orders} notes={notes} /> */}

            {showSignature && <SignatureCapture title="Xác nhận" onSave={() => setShowSignature(null)} onCancel={() => setShowSignature(null)} />}

            {/* Header & EWS */}
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
                                {/* <span>Phòng: <span className="text-slate-900 font-bold">{patient.room}-{patient.bed}</span></span> */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Clinical Briefing */}
            {/* {aiSummary && (
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1 rounded-3xl shadow-xl mb-6">
                    <div className="bg-white/95 rounded-[22px] p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs">
                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                            </div>
                            <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">Tóm tắt lâm sàng AI</h3>
                        </div>
                        <div className="prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed" 
                            dangerouslySetInnerHTML={{ __html: aiSummary.replace(/\n/g, '<br/>').replace(/• /g, '✨ ') }} />
                    </div>
                </div>
            )} */}

            {/* Main Tabs */}
            <div className="flex overflow-x-auto gap-1 mb-8 border-b border-slate-200 pb-1 scrollbar-hide">
                {[
                    { id: 'record', label: 'Bệnh án', icon: 'fa-file-medical' },
                    { id: 'services', label: 'CLS/DVKT', icon: 'fa-microscope' },
                    { id: 'meds', label: 'Dùng thuốc', icon: 'fa-pills' },
                    { id: 'vitals', label: 'Sinh hiệu', icon: 'fa-heart-pulse' },
                    { id: 'notes', label: 'Diễn biến', icon: 'fa-clipboard-user' },
                    { id: 'documents', label: 'Tài liệu', icon: 'fa-book' },
                    // { id: 'history', label: 'Lịch sử', icon: 'fa-briefcase' },
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

                        {/* Filter (view only) */}
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

            {/* OTHER TABS history */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6">Lịch sử chuyển khoa</h3>
                        <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
                            <div className="relative pl-8">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white bg-blue-500"></div>
                                <div className="text-xs text-slate-400 mb-1">25/10/2023</div>
                                <h4 className="font-bold text-slate-800 text-base">Chuyển khoa phòng</h4>
                                <p className="text-sm text-slate-600 mt-1">Chuyển từ Khoa Khám bệnh sang khoa nội</p>
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800 mb-6 mt-6">Lịch sử chuyển buồng</h3>
                        <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
                            <div className="relative pl-8">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white bg-blue-500"></div>
                                <div className="text-xs text-slate-400 mb-1">25/09/2023</div>
                                <h4 className="font-bold text-slate-800 text-base">Chuyển buồng</h4>
                                <p className="text-sm text-slate-600 mt-1">Chuyển từ phòng 401/ giường 201 sang phòng 402/ giường 302</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
