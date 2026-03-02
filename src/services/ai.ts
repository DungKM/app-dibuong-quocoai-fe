import { ProgressNote } from "@/types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

function buildSystemPrompt(patientName: string, notes?: ProgressNote[]): string {
  return `Bạn là trợ lý AI hỗ trợ lâm sàng cho bác sĩ. Trả lời ngắn gọn, chính xác bằng tiếng Việt.
Luôn nhắc bác sĩ xác nhận lại trước khi ra quyết định lâm sàng.

=== BỆNH NHÂN: ${patientName} ===
${notes?.length
    ? `Diễn biến bệnh:\n${JSON.stringify(notes, null, 2)}`
    : 'Chưa có dữ liệu diễn biến.'}
`;
}

export const aiService = {
  async chat(
    patientName: string,
    notes: ProgressNote[] | undefined,
    history: { role: "user" | "model"; text: string }[],
    userMessage: string
  ): Promise<string> {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystemPrompt(patientName, notes) }]
        },
        contents: [
          ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
          { role: "user", parts: [{ text: userMessage }] }
        ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message ?? "Gemini API error");
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Không có phản hồi.";
  }
};