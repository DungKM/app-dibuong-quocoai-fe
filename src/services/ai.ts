import { ProgressNote } from "@/types";
import { authStorage } from "@/services/auth.api"; // 👈 thêm cái này

const GEMINI_URL = `${import.meta.env.VITE_API_BACKEND_AUTH_NODE_URL}/api/ai/chat`;

function buildSystemPrompt(patientName: string, notes?: ProgressNote[]): string {
  return `Bạn là trợ lý AI hỗ trợ lâm sàng cho bác sĩ. Trả lời ngắn gọn, chính xác bằng tiếng Việt.
Luôn nhắc bác sĩ xác nhận lại trước khi ra quyết định lâm sàng.

=== BỆNH NHÂN: ${patientName} ===
${notes?.length ? `Diễn biến bệnh:\n${JSON.stringify(notes, null, 2)}` : "Chưa có dữ liệu diễn biến."}
`;
}

export const aiService = {
  async chat(
    patientName: string,
    notes: ProgressNote[] | undefined,
    history: { role: "user" | "model"; text: string }[],
    userMessage: string
  ): Promise<string> {
    const token = authStorage.getAccessToken(); // 👈 lấy accessToken

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}), // 👈 thêm header
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystemPrompt(patientName, notes) }],
        },
        contents: [
          ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
          { role: "user", parts: [{ text: userMessage }] },
        ],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) {
      // đôi khi backend trả text/html hoặc plain text, nên đọc an toàn:
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