import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ Tipe input untuk model Gemini
type InputPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

interface GenerateRequest {
  prompt: string;
  image?: string;
  mimeType?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

// 🔥 Fungsi ambil berita real-time dari GNews API
async function fetchNews(query: string) {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ GNEWS_API_KEY belum diset di .env.local");
    return { articles: [], message: "API Key GNews belum diset di .env.local" };
  }

  const fixedQuery = query.length < 5 ? `berita terbaru ${query}` : query;
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
    fixedQuery
  )}&lang=id&max=3&apikey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("❌ GNews Error:", res.status, res.statusText);
      return { articles: [], message: "Gagal mengambil berita." };
    }

    const data = await res.json();
    if (!data.articles?.length) {
      return { articles: [], message: "Tidak ada berita terkait." };
    }

    return { articles: data.articles, message: "Berhasil ambil berita." };
  } catch (err) {
    console.error("❌ Error fetch berita:", err);
    return { articles: [], message: "Error fetch berita." };
  }
}

// ✅ Handler utama API
export async function POST(req: Request): Promise<Response> {
  try {
    const {
      prompt,
      image,
      mimeType,
      model = "gemini-2.0-flash",
      temperature = 0.2,
      maxOutputTokens = 1024,
      topP = 0.8,
      topK = 40,
    }: GenerateRequest = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt wajib diisi." },
        { status: 400 }
      );
    }

    // ✅ Pastikan API key tersedia
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum diset di .env.local" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelInstance = genAI.getGenerativeModel({ model });

    // 🔥 Jika prompt mengandung kata "berita" → ambil berita real-time
    let newsText = "";
    let sources: { title: string; url: string }[] = [];

    if (/berita|news|headline|politik|ekonomi|bola|dunia/i.test(prompt)) {
      const news = await fetchNews(prompt);

      if (news.articles.length > 0) {
        newsText = news.articles
          .map(
            (a: any, i: number) =>
              `(${i + 1}) ${a.title} — ${a.source.name}\n${a.url}`
          )
          .join("\n\n");

        sources = news.articles.map((a: any) => ({
          title: a.title,
          url: a.url,
        }));
      } else {
        newsText = news.message;
      }
    }

    // ✅ Fakta tambahan + waktu
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentDate = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // ✅ Prompt akhir ke Gemini
    const enhancedPrompt = `
Tahun: ${currentYear}
Tanggal saat ini: ${currentDate}

Berita atau fakta tambahan (dari GNews):
${newsText || "Tidak ditemukan berita relevan."}

Pertanyaan pengguna:
${prompt}

Instruksi:
- Jawablah dengan bahasa Indonesia yang baik dan jelas.
- Jika kamu menyebut informasi dari berita di atas, tambahkan nomor referensi [1], [2], dst.
- Jangan membuat informasi palsu. Jika tidak tahu, katakan "Maaf, saya tidak tahu."
`;

    const inputs: InputPart[] = [{ text: enhancedPrompt }];

    if (image) {
      inputs.push({
        inlineData: {
          data: image.replace(/^data:image\/\w+;base64,/, ""),
          mimeType: mimeType || "image/png",
        },
      });
    }

    // 🔮 Panggil Gemini API
    const result = await modelInstance.generateContent({
      contents: [{ role: "user", parts: inputs }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        topP,
        topK,
      },
    });

    // ✅ Ambil output teks
    let output = "";
    if (result.response) {
      try {
        output = result.response.text();
      } catch {
        output = JSON.stringify(result.response);
      }
    }

    // 🔗 Format sumber agar klikable di frontend
    const formattedSources =
      sources.length > 0
        ? sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`)
        : ["Tidak ada sumber tambahan."];

    return NextResponse.json({ output, sources: formattedSources });
  } catch (err: unknown) {
    console.error("❌ Error API Gemini:", err);
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan pada server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}