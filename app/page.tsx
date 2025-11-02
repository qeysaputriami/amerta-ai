"use client";

import { useState, useEffect } from "react";
import { Send, User, Bot } from "lucide-react";

interface Message {
  id: number;
  sender: "user" | "bot";
  text: string;
}

export default function ChatRoom() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Ambil riwayat obrolan dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem("amerta_chat_history");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  // Simpan obrolan ke localStorage setiap ada perubahan
  useEffect(() => {
    localStorage.setItem("amerta_chat_history", JSON.stringify(messages));
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!prompt.trim()) return;

    const newMsg: Message = {
      id: Date.now(),
      sender: "user",
      text: prompt,
    };

    setMessages((prev) => [...prev, newMsg]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Terjadi kesalahan");

      const botMsg: Message = {
        id: Date.now() + 1,
        sender: "bot",
        text: data.output,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: "bot",
          text: `❌ Error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    setMessages([]);
    localStorage.removeItem("amerta_chat_history");
  }

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-white/70 backdrop-blur-md border-b">
        <h1 className="text-2xl font-bold text-purple-600">💬 A Amerta Chat</h1>
        <button
          onClick={handleNewChat}
          className="px-4 py-2 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-lg hover:opacity-90 transition"
        >
          + Chat Baru
        </button>
      </header>

      {/* Area Chat */}
      <section className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 italic">
            Belum ada percakapan. Mulai ngobrol ✨
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender === "bot" && (
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white shadow-md">
                <Bot size={18} />
              </div>
            )}

            <div
              className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                msg.sender === "user"
                  ? "bg-gradient-to-r from-blue-400 to-purple-400 text-white rounded-br-none"
                  : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>

            {msg.sender === "user" && (
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white shadow-md">
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-purple-500">
            <span className="animate-bounce">💭</span>
            <p>Gemini sedang berpikir...</p>
          </div>
        )}
      </section>

      {/* Input Chat */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-md border-t"
      >
        <textarea
          className="flex-1 resize-none p-3 border-2 border-transparent focus:border-purple-400 focus:ring-2 focus:ring-pink-300 rounded-lg bg-white/90 text-gray-700 placeholder-gray-500 transition-all"
          rows={1}
          placeholder="Tulis pesan..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="p-3 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-white hover:opacity-90 transition disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </form>
    </main>
  );
}
