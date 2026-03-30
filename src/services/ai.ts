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

function buildSystemPrompt(
  patientName: string,
  notes?: ProgressNote[],
  benhAnInfo?: BenhAnInfo
): string {
  return `Bạn là trợ lý AI hỗ trợ lâm sàng cho bác sĩ. Trả lời ngắn gọn, chính xác bằng tiếng Việt.
Luôn nhắc bác sĩ xác nhận lại trước khi ra quyết định lâm sàng.

=== BỆNH NHÂN: ${patientName} ===
- Lý do vào viện: ${benhAnInfo?.lyDoVaoVien || "chưa có"}
- Diễn biến bệnh: ${benhAnInfo?.dienBienBenh || "chưa có"}
- Tiền sử bản thân: ${benhAnInfo?.tienSuBenh || "chưa có"}
- Tiền sử gia đình: ${benhAnInfo?.tienSuBenhGiaDinh || "chưa có"}
- Chẩn đoán: ${benhAnInfo?.chanDoan || "chưa có"}
- Hướng điều trị: ${benhAnInfo?.huongDieuTri || "chưa có"}
${notes?.length ? `\nDiễn biến ghi nhận:\n${JSON.stringify(notes, null, 2)}` : ""}
`;
}

export const aiService = {
  async chat(
    patientName: string,
    notes: ProgressNote[] | undefined,
    history: { role: "user" | "model"; text: string }[],
    userMessage: string,
    benhAnInfo?: BenhAnInfo  // 👈 thêm param
  ): Promise<string> {
    const token = authStorage.getAccessToken();

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystemPrompt(patientName, notes, benhAnInfo) }], // 👈 truyền vào
        },
        contents: [
          ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
          { role: "user", parts: [{ text: userMessage }] },
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Không có phản hồi.";
  },
};