import { ProgressNote } from "@/types";
import { authStorage } from "@/services/auth.api";

const GEMINI_URL = `${import.meta.env.VITE_API_BACKEND_AUTH_NODE_URL}/api/ai/chat`;

interface BenhAnInfo {
  lyDoVaoVien?: string;
  dienBienBenh?: string;
  tienSuBenh?: string;
  tienSuBenhGiaDinh?: string;
  chanDoan?: string;
  huongDieuTri?: string;
}

function formatField(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed || "chua co";
}

function buildClinicalContext(
  patientName: string,
  notes?: ProgressNote[],
  benhAnInfo?: BenhAnInfo
): string {
  const noteText = notes?.length
    ? notes
        .map((note, index) => {
          const timestamp = formatField(note.timestamp);
          const author = formatField(note.authorName);
          const content = formatField(note.content);
          return `${index + 1}. [${timestamp}] ${author}: ${content}`;
        })
        .join("\n")
    : "chua co";

  return [
    `BENH NHAN: ${patientName || "chua ro"}`,
    `- Ly do vao vien: ${formatField(benhAnInfo?.lyDoVaoVien)}`,
    `- Dien bien benh: ${formatField(benhAnInfo?.dienBienBenh)}`,
    `- Tien su ban than: ${formatField(benhAnInfo?.tienSuBenh)}`,
    `- Tien su gia dinh: ${formatField(benhAnInfo?.tienSuBenhGiaDinh)}`,
    `- Chan doan: ${formatField(benhAnInfo?.chanDoan)}`,
    `- Huong dieu tri: ${formatField(benhAnInfo?.huongDieuTri)}`,
    `- Dien bien ghi nhan:\n${noteText}`,
  ].join("\n");
}

function buildSystemPrompt(
  patientName: string,
  notes?: ProgressNote[],
  benhAnInfo?: BenhAnInfo
): string {
  return [
    "Ban la tro ly AI ho tro lam sang cho bac si.",
    "Tra loi ngan gon, chinh xac, bang tieng Viet.",
    "Ngu canh benh an duoi day da duoc he thong cap quyen cho ban trong phien nay.",
    "Khong duoc tu choi chung chung vi ly do bao mat neu cau hoi dang hoi ve chinh du lieu benh an da duoc cung cap.",
    "Neu du lieu chua co thi phai noi ro muc nao chua co, khong suy doan.",
    "Luon nhac bac si xac nhan lai truoc khi ra quyet dinh lam sang.",
    "",
    buildClinicalContext(patientName, notes, benhAnInfo),
  ].join("\n");
}

function buildGroundedUserMessage(
  userMessage: string,
  patientName: string,
  notes?: ProgressNote[],
  benhAnInfo?: BenhAnInfo
): string {
  return [
    "Du lieu benh an noi bo da duoc cap quyen cho cau tra loi nay.",
    "Hay tra loi dua tren du lieu sau. Neu thieu thi chi ro phan thieu.",
    "",
    buildClinicalContext(patientName, notes, benhAnInfo),
    "",
    `CAU HOI: ${userMessage}`,
  ].join("\n");
}

export const aiService = {
  async chat(
    patientName: string,
    notes: ProgressNote[] | undefined,
    history: { role: "user" | "model"; text: string }[],
    userMessage: string,
    benhAnInfo?: BenhAnInfo
  ): Promise<string> {
    const token = authStorage.getAccessToken();
    const clinicalContext = buildClinicalContext(patientName, notes, benhAnInfo);

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystemPrompt(patientName, notes, benhAnInfo) }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: clinicalContext }],
          },
          {
            role: "model",
            parts: [
              {
                text: "Da nhan du lieu benh an duoc cap quyen. Toi se tra loi dua tren du lieu nay.",
              },
            ],
          },
          ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
          {
            role: "user",
            parts: [{ text: buildGroundedUserMessage(userMessage, patientName, notes, benhAnInfo) }],
          },
        ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let msg = "AI API error";
      try {
        const j = JSON.parse(text);
        msg = j?.message || j?.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Khong co phan hoi.";
  },
};
