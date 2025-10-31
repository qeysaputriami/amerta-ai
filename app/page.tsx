"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState(""); // teks yang sedang diketik
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false); // status berpikir

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setThinking(true);
    setError(null);
    setAnswer("");
    setDisplayedAnswer("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Terjadi kesalahan");

      // Simpan hasil untuk efek typing
      setAnswer(data.output);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setThinking(false);
    }
  }

  // Efek teks berjalan (typing)
  useEffect(() => {
    if (!answer) return;

    let i = 0;
    setDisplayedAnswer("");
    const interval = setInterval(() => {
      setDisplayedAnswer((prev) => prev + answer[i]);
      i++;
      if (i >= answer.length) clearInterval(interval);
    }, 20); // kecepatan ketikan (20ms per karakter)

    return () => clearInterval(interval);
  }, [answer]);

  // Deteksi Enter
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: "linear-gradient(135deg, #a7c7e7, #c7a7e7, #f8c8dc)",
      }}
    >
      <div className="max-w-2xl w-full bg-white/60 backdrop-blur-md rounded-2xl shadow-xl p-8 space-y-6 border border-white/30">
        <h1 className="text-3xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-400 to-blue-400 animate-pulse">
          Amerta AI
        </h1>

        <form onSubmit={handleGenerate} className="space-y-4">
          <textarea
            className="w-full p-4 border-2 border-transparent focus:border-purple-400 focus:ring-2 focus:ring-pink-300 rounded-lg bg-white/80 text-gray-700 placeholder-gray-500 transition-all"
            rows={5}
            placeholder="Tulis pertanyaanmu di sini…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            type="submit"
            className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 hover:opacity-90 transition disabled:opacity-60"
            disabled={loading || !prompt.trim()}
          >
            {loading ? "Meminta jawaban…" : "Kirim ke Gemini"}
          </button>
        </form>

        {/* Indikator berpikir */}
        {thinking && (
          <p className="text-center text-purple-500 animate-pulse font-medium">
            💭 Gemini sedang berpikir...
          </p>
        )}

        {error && (
          <p className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
            Error: {error}
          </p>
        )}

        {/* Teks berjalan */}
        {displayedAnswer && (
          <section className="p-5 rounded-xl bg-gradient-to-br from-white/70 to-white/40 border border-white/50 backdrop-blur-md shadow-inner">
            <h2 className="font-semibold mb-2 text-purple-600">💡 Jawaban</h2>
            <pre className="whitespace-pre-wrap text-gray-800">
              {displayedAnswer}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
