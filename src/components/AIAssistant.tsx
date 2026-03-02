import React, { useState, useRef, useEffect } from 'react';
import { aiService } from '@/services/ai';
import { ProgressNote } from "@/types";

interface Props {
  patientName: string;
  notes?: ProgressNote[];
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export const AIAssistant: React.FC<Props> = ({ patientName, notes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: `Xin chào, tôi là trợ lý AI. Tôi đã đọc diễn biến của bệnh nhân **${patientName}**. Bạn cần hỏi gì?`,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await aiService.chat(patientName, notes, chatHistory, text);

      setChatHistory(prev => [
        ...prev,
        { role: "user", text },
        { role: "model", text: responseText }
      ]);

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: "Lỗi kết nối Gemini API. Kiểm tra API key.", timestamp: new Date() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const SUGGESTIONS = [
    { label: "Tóm tắt diễn biến", icon: "fa-file-medical-alt" },
    { label: "Cảnh báo rủi ro", icon: "fa-triangle-exclamation" },
    { label: "Đề xuất theo dõi", icon: "fa-clipboard-user" },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 sm:bottom-6 right-4 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 ${
          isOpen ? 'bg-slate-800 rotate-90' : 'bg-gradient-to-r from-indigo-500 to-purple-600 animate-pulse'
        }`}
      >
        {isOpen
          ? <i className="fa-solid fa-xmark text-white text-xl"></i>
          : <i className="fa-solid fa-wand-magic-sparkles text-white text-xl"></i>
        }
      </button>

      {isOpen && (
        <div className="fixed bottom-24 sm:bottom-24 right-4 z-40 w-[90vw] sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden h-[60vh] sm:h-[500px] animate-fade-in">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <i className="fa-solid fa-robot text-white"></i>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">MediRound AI</h3>
              <p className="text-indigo-100 text-[10px]">Hỗ trợ lâm sàng · {patientName}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                }`}>
                  {msg.role === 'ai' ? (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                        .replace(/\n/g, '<br/>')
                        .replace(/- /g, '• ')
                    }} />
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 flex gap-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-hide">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s.label)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center gap-1.5 border border-transparent hover:border-indigo-100"
              >
                <i className={`fa-solid ${s.icon}`}></i> {s.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi lâm sàng..."
                className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};