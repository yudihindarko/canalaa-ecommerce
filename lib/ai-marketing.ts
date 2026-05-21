import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash-image-preview";

const SPORT_SETTINGS = [
  "trek lari outdoor saat golden hour",
  "stadium athletic track dengan lampu sore",
  "gym modern dengan equipment di latar",
  "basketball court urban dengan graffiti samar",
  "park dengan jogging path di antara pepohonan",
];

const STREETWEAR_SETTINGS = [
  "jalan kecil Jakarta saat golden hour, suasana editorial",
  "rooftop dengan pemandangan kota Jakarta",
  "cafe minimalis dengan pencahayaan natural",
  "skate park dengan ramp di belakang model",
  "koridor mall dengan estetika editorial",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt(
  style: "sport" | "streetwear",
  setting: string,
  productName: string,
): string {
  const styleDesc =
    style === "sport"
      ? "Outfit athletic / sport: training jersey, jogger, athleisure. Model dalam pose aktif atau lifestyle olahraga."
      : "Outfit streetwear: oversized hoodie, cargo pants, casual urban wear. Model dalam pose lifestyle santai.";

  return `Buat foto editorial fashion dengan model Indonesia (usia 20-30 tahun) memakai SEPATU PERSIS SAMA dengan gambar input ini (pertahankan warna, bentuk, dan detail sepatu seakurat mungkin — tidak boleh berubah).

Deteksi gender dari sepatu: jika dominan warna pink/rose/feminim → model perempuan. Jika tidak (hitam, putih, abu, biru, hijau, dll) → model lelaki.

${styleDesc}

Setting: ${setting}.

Fotografi: editorial professional, golden hour lighting, kualitas DSLR, full body atau 3/4 body shot di mana sepatu terlihat jelas dan menarik. Komposisi vertical 4:5 (ratio untuk feed Instagram).

Konteks produk: ${productName}.

Output: gambar saja, tanpa text overlay.`;
}

export type GeneratedVariant = {
  buffer: Buffer;
  mimeType: string;
  alt: string;
  variant: "sport" | "streetwear";
  setting: string;
};

function findImagePart(
  parts: Array<{ inlineData?: { data?: string; mimeType?: string } }>,
): { data: string; mimeType: string } | null {
  for (const p of parts) {
    if (p.inlineData?.data) {
      return {
        data: p.inlineData.data,
        mimeType: p.inlineData.mimeType ?? "image/png",
      };
    }
  }
  return null;
}

async function generateOneVariant(
  apiKey: string,
  originalBuffer: Buffer,
  originalMimeType: string,
  productName: string,
  style: "sport" | "streetwear",
): Promise<GeneratedVariant | null> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const setting = pickRandom(
    style === "sport" ? SPORT_SETTINGS : STREETWEAR_SETTINGS,
  );
  const prompt = buildPrompt(style, setting, productName);

  const result = await model.generateContent([
    {
      inlineData: {
        data: originalBuffer.toString("base64"),
        mimeType: originalMimeType,
      },
    },
    prompt,
  ]);

  const parts =
    (result.response.candidates?.[0]?.content?.parts as Array<{
      inlineData?: { data?: string; mimeType?: string };
    }>) ?? [];
  const img = findImagePart(parts);
  if (!img) {
    console.warn(`[ai-marketing] ${style}: no image returned`);
    return null;
  }

  const buffer = Buffer.from(img.data, "base64");
  const mimeType = img.mimeType;

  // Generate alt text from the new image
  let alt = `${productName} — ${style} editorial, ${setting}`;
  try {
    const altResult = await model.generateContent([
      { inlineData: { data: img.data, mimeType } },
      `Buat alt text SEO untuk gambar produk sepatu "${productName}" yang dipakai oleh model dalam style ${style}. Bahasa Indonesia natural, MAKSIMAL 120 karakter. Sebut nama produk dan suasana visual. Hanya output alt text-nya saja, tanpa tanda kutip atau prefix.`,
    ]);
    const altText = altResult.response.text().trim();
    if (altText && altText.length <= 200) alt = altText;
  } catch (err) {
    console.warn(`[ai-marketing] ${style} alt gen failed:`, err);
  }

  return { buffer, mimeType, alt, variant: style, setting };
}

export async function generateMarketingVariants(
  originalBuffer: Buffer,
  originalMimeType: string,
  productName: string,
): Promise<GeneratedVariant[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const results = await Promise.allSettled([
    generateOneVariant(apiKey, originalBuffer, originalMimeType, productName, "sport"),
    generateOneVariant(apiKey, originalBuffer, originalMimeType, productName, "streetwear"),
  ]);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<GeneratedVariant | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((v): v is GeneratedVariant => v !== null);
}

export async function generateAltTextForImage(
  imageBuffer: Buffer,
  mimeType: string,
  productName: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent([
    { inlineData: { data: imageBuffer.toString("base64"), mimeType } },
    `Buat alt text SEO untuk gambar produk sepatu "${productName}". Bahasa Indonesia natural, MAKSIMAL 120 karakter. Deskripsikan warna, sudut pengambilan, dan kesan visual. Hanya output alt text-nya saja, tanpa tanda kutip.`,
  ]);

  const text = result.response.text().trim();
  return text.length > 200 ? text.slice(0, 200) : text;
}
