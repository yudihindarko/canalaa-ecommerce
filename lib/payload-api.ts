function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export type DraftSize = { eu: number; cm: number; inStock?: boolean };

export type DraftProduct = {
  name: string;
  price: number;
  sizes: DraftSize[];
  photoBuffers: Array<{ buffer: Buffer; mimeType: string; filename: string }>;
  featured?: boolean;
};

export function randomPriceIDR(): number {
  const minK = 450;
  const maxK = 530;
  const stepK = 5;
  const steps = Math.floor((maxK - minK) / stepK) + 1;
  return (minK + Math.floor(Math.random() * steps) * stepK) * 1000;
}

const SIZE_LINE = /^[\d\s,.\-]+$/;

export type ParsedCaption = {
  name: string;
  sizes?: DraftSize[];
  price?: number;
  featured?: boolean;
  errors: string[];
};

function parseExplicitSize(line: string): DraftSize | null {
  // Matches: "40=25cm", "40 = 25", "EU 40 = 25cm", "40=25.5cm", "40 = 25,5"
  const m = line.match(/^(?:eu\s*)?(\d+)\s*=\s*([\d.,]+)\s*(?:cm)?$/i);
  if (!m) return null;
  const eu = parseInt(m[1], 10);
  const cm = parseFloat(m[2].replace(",", "."));
  if (!Number.isFinite(eu) || !Number.isFinite(cm)) return null;
  if (eu < 30 || eu > 60) return null;
  return { eu, cm, inStock: true };
}

export function parseCaption(caption: string): ParsedCaption {
  const lines = caption
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const errors: string[] = [];

  if (lines.length === 0) {
    return { name: "", featured: true, errors: ["Caption kosong"] };
  }

  const name = lines[0];
  const explicitSizes: DraftSize[] = [];
  let sizes: DraftSize[] | undefined;
  let price: number | undefined;
  let featured = true; // default ON — all new products featured

  for (const line of lines.slice(1)) {
    const lower = line.toLowerCase();

    // Explicit "40=25cm" mappings — accumulate
    const explicit = parseExplicitSize(line);
    if (explicit) {
      explicitSizes.push(explicit);
      continue;
    }

    if (lower === "featured" || lower === "⭐" || lower === "homepage") {
      featured = true;
      continue;
    }
    if (lower === "not featured" || lower === "unfeatured" || lower === "hide") {
      featured = false;
      continue;
    }

    // Price patterns: "Rp 485k", "485k", "IDR 485000", "485000"
    const priceMatch = line.match(
      /^(?:rp|idr|harga|price)?\s*([\d.,]+)\s*(k|rb|ribu)?$/i,
    );
    if (priceMatch) {
      const cleaned = priceMatch[1].replace(/[.,](?=\d{3}(\D|$))/g, "");
      let num = parseFloat(cleaned.replace(/,/g, "."));
      if (priceMatch[2]) num *= 1000;
      if (Number.isFinite(num) && num >= 10_000 && num <= 10_000_000) {
        price = Math.round(num);
        continue;
      }
    }

    // Sizes: pure numbers w/ commas or dashes, range 30-60
    if (SIZE_LINE.test(line)) {
      const parsed = parseSizes(line);
      const inShoeRange =
        parsed.length > 0 && parsed.every((s) => s.eu >= 30 && s.eu <= 60);
      if (inShoeRange) {
        sizes = parsed;
        continue;
      }
    }
  }

  // Explicit sizes (40=25cm style) take priority over range sizes
  if (explicitSizes.length > 0) sizes = explicitSizes;

  if (!sizes)
    errors.push("Ukuran tidak terdeteksi (contoh: 41,42 atau 40=25cm)");

  return { name, sizes, price, featured, errors };
}

export function parseSizes(input: string): DraftSize[] {
  const trimmed = input.trim();
  let nums: number[] = [];
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    for (let i = start; i <= end; i++) nums.push(i);
  } else {
    nums = trimmed
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n));
  }
  return nums.map((eu) => ({
    eu,
    cm: 22.5 + (eu - 36) * 0.5,
    inStock: true,
  }));
}

function getApiUrl(): string {
  if (process.env.PAYLOAD_API_URL) return process.env.PAYLOAD_API_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.PAYLOAD_API_URL) {
    return process.env.PAYLOAD_API_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const API_URL = getApiUrl();

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const email = process.env.PAYLOAD_ADMIN_EMAIL;
  const password = process.env.PAYLOAD_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "PAYLOAD_ADMIN_EMAIL / PAYLOAD_ADMIN_PASSWORD not set in .env.local",
    );
  }

  const res = await fetch(`${API_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(
      `Login gagal: ${res.status} ${await res.text()}. Cek email/password admin.`,
    );
  }
  const data = (await res.json()) as {
    token: string;
    exp: number;
    user: { id: string };
  };
  cachedToken = data.token;
  tokenExpiresAt = data.exp * 1000;
  return cachedToken;
}

async function uploadMedia(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  alt: string,
): Promise<string> {
  const token = await getToken();
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  form.append("file", blob, filename);
  form.append("_payload", JSON.stringify({ alt }));

  const res = await fetch(`${API_URL}/api/media`, {
    method: "POST",
    headers: { Authorization: `JWT ${token}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload foto gagal: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { doc: { id: string } };
  return data.doc.id;
}

export async function createProductFromDraft(
  draft: DraftProduct,
): Promise<{ slug: string; id: string }> {
  const token = await getToken();

  const mediaIds: string[] = [];
  for (const photo of draft.photoBuffers) {
    const id = await uploadMedia(
      photo.buffer,
      photo.filename,
      photo.mimeType,
      `${draft.name} — ${photo.filename}`,
    );
    mediaIds.push(id);
  }

  const baseSlug = slugify(draft.name);
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const body = {
      name: draft.name,
      slug,
      price: draft.price,
      featured: draft.featured ?? false,
      images: mediaIds.map((id) => ({ image: id })),
      sizes: draft.sizes.map((s) => ({
        eu: s.eu,
        cm: s.cm,
        inStock: s.inStock !== false,
      })),
    };

    const res = await fetch(`${API_URL}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        doc: { id: string; slug: string };
      };
      return { slug: data.doc.slug, id: data.doc.id };
    }

    const errorText = await res.text();
    const isSlugConflict =
      res.status === 400 && /"path"\s*:\s*"slug"/.test(errorText);
    if (isSlugConflict) continue;

    throw new Error(`Buat produk gagal: ${res.status} ${errorText}`);
  }

  throw new Error(
    `Tidak bisa membuat slug unik untuk "${draft.name}" setelah ${maxAttempts} percobaan`,
  );
}

// ─── Sales ──────────────────────────────────────────────────────────────

export type PendingSaleInput = {
  reportDate: Date;
  itemNumber: number;
  productName: string;
  amount: number;
  cogs: number;
  paymentMethod: string;
  rawLine: string;
  reportedByEmail?: string;
};

export async function createPendingSales(
  items: PendingSaleInput[],
): Promise<string[]> {
  const token = await getToken();
  const ids: string[] = [];

  for (const item of items) {
    const res = await fetch(`${API_URL}/api/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({
        reportDate: item.reportDate.toISOString(),
        itemNumber: item.itemNumber,
        productName: item.productName,
        amount: item.amount,
        cogs: item.cogs,
        paymentMethod: item.paymentMethod,
        rawLine: item.rawLine,
        status: "pending",
        reportedAt: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Simpan pending sale gagal: ${res.status} ${await res.text()}`,
      );
    }
    const data = (await res.json()) as { doc: { id: string | number } };
    ids.push(String(data.doc.id));
  }

  return ids;
}

export async function confirmSales(ids: string[]): Promise<void> {
  const token = await getToken();
  for (const id of ids) {
    const res = await fetch(`${API_URL}/api/sales/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ status: "confirmed" }),
    });
    if (!res.ok) {
      throw new Error(
        `Konfirmasi sale ${id} gagal: ${res.status} ${await res.text()}`,
      );
    }
  }
}

export async function rejectSales(ids: string[]): Promise<void> {
  const token = await getToken();
  for (const id of ids) {
    const res = await fetch(`${API_URL}/api/sales/${id}`, {
      method: "DELETE",
      headers: { Authorization: `JWT ${token}` },
    });
    // 404 = already gone, treat as success
    if (!res.ok && res.status !== 404) {
      throw new Error(
        `Reject sale ${id} gagal: ${res.status} ${await res.text()}`,
      );
    }
  }
}

// ─── Expenses ───────────────────────────────────────────────────────────

export type PendingExpenseInput = {
  month: Date;
  type: "fixed" | "variable";
  category: string;
  amount: number;
  notes?: string;
};

export async function createPendingExpenses(
  items: PendingExpenseInput[],
): Promise<string[]> {
  const token = await getToken();
  const ids: string[] = [];

  for (const item of items) {
    const res = await fetch(`${API_URL}/api/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({
        month: item.month.toISOString(),
        type: item.type,
        category: item.category,
        amount: item.amount,
        notes: item.notes ?? "",
        status: "pending",
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Simpan pending expense gagal: ${res.status} ${await res.text()}`,
      );
    }
    const data = (await res.json()) as { doc: { id: string | number } };
    ids.push(String(data.doc.id));
  }

  return ids;
}

export async function confirmExpenses(ids: string[]): Promise<void> {
  const token = await getToken();
  for (const id of ids) {
    const res = await fetch(`${API_URL}/api/expenses/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ status: "confirmed" }),
    });
    if (!res.ok) {
      throw new Error(
        `Konfirmasi expense ${id} gagal: ${res.status} ${await res.text()}`,
      );
    }
  }
}

export async function rejectExpenses(ids: string[]): Promise<void> {
  const token = await getToken();
  for (const id of ids) {
    const res = await fetch(`${API_URL}/api/expenses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `JWT ${token}` },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(
        `Reject expense ${id} gagal: ${res.status} ${await res.text()}`,
      );
    }
  }
}

function monthBoundsISO(monthDate: Date): { startISO: string; endISO: string } {
  const start = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1),
  );
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export async function countConfirmedExpensesForMonth(
  monthDate: Date,
): Promise<number> {
  const token = await getToken();
  const { startISO, endISO } = monthBoundsISO(monthDate);
  const url =
    `${API_URL}/api/expenses` +
    `?where[and][0][status][equals]=confirmed` +
    `&where[and][1][month][greater_than_equal]=${encodeURIComponent(startISO)}` +
    `&where[and][2][month][less_than]=${encodeURIComponent(endISO)}` +
    `&limit=1&depth=0`;
  const res = await fetch(url, {
    headers: { Authorization: `JWT ${token}` },
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { totalDocs?: number };
  return data.totalDocs ?? 0;
}

export async function deleteConfirmedExpensesForMonth(
  monthDate: Date,
): Promise<number> {
  const token = await getToken();
  const { startISO, endISO } = monthBoundsISO(monthDate);
  const findUrl =
    `${API_URL}/api/expenses` +
    `?where[and][0][status][equals]=confirmed` +
    `&where[and][1][month][greater_than_equal]=${encodeURIComponent(startISO)}` +
    `&where[and][2][month][less_than]=${encodeURIComponent(endISO)}` +
    `&limit=500&depth=0`;
  const findRes = await fetch(findUrl, {
    headers: { Authorization: `JWT ${token}` },
  });
  if (!findRes.ok) {
    throw new Error(
      `Find expenses gagal: ${findRes.status} ${await findRes.text()}`,
    );
  }
  const findData = (await findRes.json()) as {
    docs: Array<{ id: string | number }>;
  };

  let deleted = 0;
  for (const doc of findData.docs) {
    const delRes = await fetch(`${API_URL}/api/expenses/${doc.id}`, {
      method: "DELETE",
      headers: { Authorization: `JWT ${token}` },
    });
    if (delRes.ok || delRes.status === 404) deleted++;
  }
  return deleted;
}
