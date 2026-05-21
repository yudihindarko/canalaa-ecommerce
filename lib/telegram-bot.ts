import { Bot, Context, InlineKeyboard } from "grammy";
import {
  confirmExpenses,
  confirmSales,
  countConfirmedExpensesForMonth,
  createPendingExpenses,
  createPendingSales,
  createProductFromDraft,
  deleteConfirmedExpensesForMonth,
  getSiteUrl,
  parseCaption,
  parseSizes,
  randomPriceIDR,
  rejectExpenses,
  rejectSales,
  type DraftProduct,
  type DraftSize,
} from "./payload-api";
import {
  looksLikeSalesReport,
  parseSalesReport,
  type ParsedSaleItem,
} from "./sales-parser";
import {
  EXPENSE_LABEL,
  looksLikeExpenseReport,
  parseExpenseReport,
  type ParsedExpenseItem,
} from "./expense-parser";

type PhotoBuffer = { buffer: Buffer; mimeType: string; filename: string };

const mediaGroups = new Map<
  string,
  {
    photos: PhotoBuffer[];
    caption?: string;
    ctx: Context;
    timer: NodeJS.Timeout | null;
  }
>();

async function downloadPhoto(
  ctx: Context,
  fileId: string,
): Promise<PhotoBuffer> {
  const file = await ctx.api.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = `${Date.now()}-${file.file_path?.split("/").pop() ?? "photo.jpg"}`;
  return { buffer, mimeType: "image/jpeg", filename };
}

/**
 * Fire-and-forget call to the AI marketing endpoint. The endpoint returns 200
 * immediately and runs the actual Gemini work in its own background context,
 * so this awaits only the quick ack — bot reply stays snappy.
 */
async function triggerAiMarketing(productId: string | number) {
  const secret = process.env.AI_GENERATION_SECRET;
  if (!secret) {
    console.warn("[bot] AI_GENERATION_SECRET not set — skipping AI marketing");
    return;
  }
  try {
    const res = await fetch(`${getSiteUrl()}/api/admin/generate-marketing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok) {
      console.warn(
        "[bot] AI marketing trigger non-OK:",
        res.status,
        await res.text(),
      );
    }
  } catch (err) {
    console.error("[bot] AI marketing trigger failed:", err);
  }
}

async function handleQuickAdd(
  ctx: Context,
  photos: PhotoBuffer[],
  caption: string | undefined,
) {
  if (!caption) {
    await ctx.reply(
      "📷 Foto diterima tanpa caption. Tambahkan caption dengan nama + ukuran, contoh:\n\n`Sambah Black White\n41,42`\n\nAtau pakai /add untuk wizard.",
      { parse_mode: "Markdown" },
    );
    return;
  }

  const parsed = parseCaption(caption);

  if (!parsed.name) {
    await ctx.reply("⚠️ Nama produk kosong (baris pertama caption).");
    return;
  }
  if (parsed.errors.length > 0) {
    await ctx.reply(
      `⚠️ Caption belum lengkap:\n${parsed.errors.map((e) => `• ${e}`).join("\n")}\n\nFormat:\n\`Nama Produk\n39-44\``,
      { parse_mode: "Markdown" },
    );
    return;
  }

  const price = parsed.price ?? randomPriceIDR();
  const priceWasRandom = parsed.price === undefined;

  await ctx.reply(
    `⏳ Membuat *${parsed.name}* (${photos.length} foto, ${parsed.sizes!.length} ukuran${priceWasRandom ? `, harga random Rp ${price.toLocaleString("id-ID")}` : ""
    })...`,
    { parse_mode: "Markdown" },
  );

  try {
    const draft: DraftProduct = {
      name: parsed.name,
      price,
      sizes: parsed.sizes!,
      photoBuffers: photos,
      featured: parsed.featured ?? false,
    };
    const { slug, id } = await createProductFromDraft(draft);
    const site = getSiteUrl();
    await ctx.reply(
      `✅ *${draft.name}* berhasil dibuat!\n\n` +
      `→ ${site}/products/${slug}\n` +
      `→ ${site}/admin/collections/products\n\n` +
      `🤖 _Generating 2 AI marketing variants di background..._`,
      { parse_mode: "Markdown" },
    );
    await triggerAiMarketing(id);
  } catch (err) {
    console.error("[bot] quick-add error:", err);
    await ctx.reply(`❌ Gagal: ${(err as Error).message}`);
  }
}

function bufferMediaGroup(
  ctx: Context,
  groupId: string,
  photo: PhotoBuffer,
  caption: string | undefined,
) {
  let group = mediaGroups.get(groupId);
  if (!group) {
    group = { photos: [], ctx, timer: null };
    mediaGroups.set(groupId, group);
  }
  group.photos.push(photo);
  if (caption) group.caption = caption;
  if (group.timer) clearTimeout(group.timer);
  group.timer = setTimeout(() => {
    mediaGroups.delete(groupId);
    void handleQuickAdd(group!.ctx, group!.photos, group!.caption);
  }, 2500);
}

const INDO_MONTHS_FULL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatIndoDate(d: Date): string {
  return `${d.getUTCDate()} ${INDO_MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function buildPreview(date: Date, items: ParsedSaleItem[]): string {
  const lines = items.map(
    (it) =>
      `${it.itemNumber}. ${it.productName} — ${formatIDR(it.amount)} (${it.paymentMethod}) · modal ${formatIDR(it.cogs)}`,
  );
  const totalSell = items.reduce((s, it) => s + it.amount, 0);
  const totalCogs = items.reduce((s, it) => s + it.cogs, 0);
  const profit = totalSell - totalCogs;

  return [
    `📋 *Laporan ${formatIndoDate(date)}* (${items.length} item)`,
    "",
    ...lines,
    "",
    `💰 Total jual: ${formatIDR(totalSell)}`,
    `📦 Total modal: ${formatIDR(totalCogs)}`,
    `📈 Laba kotor: ${formatIDR(profit)}`,
    "",
    "Konfirmasi laporan ini?",
  ].join("\n");
}

async function handleSalesReport(ctx: Context, text: string) {
  const parsed = parseSalesReport(text);

  if (!parsed.reportDate) {
    await ctx.reply(
      "⚠️ Tanggal tidak terdeteksi. Tambahkan baris seperti `TODAY 12 MEI 2026` di atas item.",
      { parse_mode: "Markdown" },
    );
    return;
  }
  if (parsed.items.length === 0) {
    await ctx.reply(
      "⚠️ Tidak ada item terdeteksi. Format: `1. Nama Produk(400-TF, 250)`",
      { parse_mode: "Markdown" },
    );
    return;
  }

  await ctx.reply("⏳ Menyimpan draft laporan...");

  let pendingIds: string[];
  try {
    pendingIds = await createPendingSales(
      parsed.items.map((it) => ({
        reportDate: parsed.reportDate!,
        itemNumber: it.itemNumber,
        productName: it.productName,
        amount: it.amount,
        cogs: it.cogs,
        paymentMethod: it.paymentMethod,
        rawLine: it.rawLine,
      })),
    );
  } catch (err) {
    console.error("[bot] sales draft error:", err);
    await ctx.reply(`❌ Gagal menyimpan draft: ${(err as Error).message}`);
    return;
  }

  const kb = new InlineKeyboard()
    .text("✅ Simpan", `sale-confirm:${pendingIds.join(",")}`)
    .text("❌ Batal", `sale-reject:${pendingIds.join(",")}`);

  let preview = buildPreview(parsed.reportDate, parsed.items);
  if (parsed.unparsedLines.length > 0) {
    preview +=
      "\n\n⚠️ Baris tidak terparsing:\n" +
      parsed.unparsedLines.map((l) => `• ${l}`).join("\n");
  }

  await ctx.reply(preview, {
    parse_mode: "Markdown",
    reply_markup: kb,
  });
}

// ─── Expense report handler ─────────────────────────────────────────────

function buildExpensePreview(
  monthDate: Date,
  items: ParsedExpenseItem[],
  unparsed: string[],
): string {
  const fixed = items.filter((i) => i.type === "fixed");
  const variable = items.filter((i) => i.type === "variable");
  const fixedTotal = fixed.reduce((s, x) => s + x.amount, 0);
  const variableTotal = variable.reduce((s, x) => s + x.amount, 0);
  const total = fixedTotal + variableTotal;

  const lines: string[] = [
    `📋 *Laporan Biaya ${formatIndoDate(monthDate).split(" ").slice(1).join(" ")}* (${items.length} item)`,
    "",
  ];

  if (fixed.length > 0) {
    lines.push("*TETAP*");
    for (const f of fixed) {
      lines.push(`  ${EXPENSE_LABEL[f.category] ?? f.category} — ${formatIDR(f.amount)}`);
    }
    lines.push(`  _Subtotal: ${formatIDR(fixedTotal)}_`);
    lines.push("");
  }

  if (variable.length > 0) {
    lines.push("*VARIABLE*");
    for (const v of variable) {
      lines.push(`  ${EXPENSE_LABEL[v.category] ?? v.category} — ${formatIDR(v.amount)}`);
    }
    lines.push(`  _Subtotal: ${formatIDR(variableTotal)}_`);
    lines.push("");
  }

  lines.push(`💰 *Total Biaya: ${formatIDR(total)}*`);

  if (unparsed.length > 0) {
    lines.push("");
    lines.push("⚠️ Baris tidak terparsing:");
    for (const u of unparsed) lines.push(`  • ${u}`);
  }

  return lines.join("\n");
}

async function handleExpenseReport(ctx: Context, text: string) {
  const parsed = parseExpenseReport(text);

  if (!parsed.monthDate) {
    await ctx.reply(
      "⚠️ Bulan tidak terdeteksi. Tambahkan baris seperti `BIAYA FEB 2026` di atas.",
      { parse_mode: "Markdown" },
    );
    return;
  }
  if (parsed.items.length === 0) {
    await ctx.reply(
      "⚠️ Tidak ada item biaya terdeteksi. Format: `Internet 177`",
      { parse_mode: "Markdown" },
    );
    return;
  }

  await ctx.reply("⏳ Menyimpan draft laporan biaya...");

  let pendingIds: string[];
  try {
    pendingIds = await createPendingExpenses(
      parsed.items.map((it) => ({
        month: parsed.monthDate!,
        type: it.type,
        category: it.category,
        amount: it.amount,
        notes: it.raw,
      })),
    );
  } catch (err) {
    console.error("[bot] expense draft error:", err);
    await ctx.reply(`❌ Gagal menyimpan draft: ${(err as Error).message}`);
    return;
  }

  let existingCount = 0;
  try {
    existingCount = await countConfirmedExpensesForMonth(parsed.monthDate);
  } catch (err) {
    console.warn("[bot] count existing expenses failed:", err);
  }

  const monthIso = parsed.monthDate.toISOString();
  const preview = buildExpensePreview(parsed.monthDate, parsed.items, parsed.unparsedLines);

  const kb = new InlineKeyboard();
  if (existingCount > 0) {
    kb.text("♻️ Replace", `expense-replace:${pendingIds.join(",")}|${monthIso}`)
      .text("➕ Tambah", `expense-confirm:${pendingIds.join(",")}`)
      .row()
      .text("❌ Batal", `expense-reject:${pendingIds.join(",")}`);
  } else {
    kb.text("✅ Simpan", `expense-confirm:${pendingIds.join(",")}`).text(
      "❌ Batal",
      `expense-reject:${pendingIds.join(",")}`,
    );
  }

  let finalText = preview;
  if (existingCount > 0) {
    finalText +=
      `\n\n⚠️ Bulan ini sudah ada *${existingCount} biaya tersimpan*. ` +
      `Pilih *Replace* untuk hapus yang lama dulu, atau *Tambah* untuk tambahkan saja.`;
  } else {
    finalText += "\n\nKonfirmasi laporan biaya ini?";
  }

  await ctx.reply(finalText, {
    parse_mode: "Markdown",
    reply_markup: kb,
  });
}

type WizardStep =
  | "idle"
  | "awaiting-name"
  | "awaiting-price"
  | "awaiting-sizes"
  | "awaiting-photos";

type WizardState = {
  step: WizardStep;
  name?: string;
  price?: number;
  sizes?: DraftSize[];
  photos: Array<{ buffer: Buffer; mimeType: string; filename: string }>;
  featured?: boolean;
};

const conversations = new Map<number, WizardState>();

function getState(userId: number): WizardState {
  let s = conversations.get(userId);
  if (!s) {
    s = { step: "idle", photos: [] };
    conversations.set(userId, s);
  }
  return s;
}

function resetState(userId: number) {
  conversations.set(userId, { step: "idle", photos: [] });
}

function getAdminIds(): Set<number> {
  const raw = process.env.TELEGRAM_ADMIN_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n)),
  );
}

function isAdmin(ctx: Context): boolean {
  const userId = ctx.from?.id;
  if (!userId) return false;
  return getAdminIds().has(userId);
}

export function buildBot(token: string): Bot {
  const bot = new Bot(token);

  bot.use(async (ctx, next) => {
    if (!isAdmin(ctx)) {
      await ctx.reply(
        `❌ Akses ditolak.\nUser ID kamu: ${ctx.from?.id}\nMinta admin untuk menambahkan ID ini ke TELEGRAM_ADMIN_IDS.`,
      );
      return;
    }
    await next();
  });

  bot.command("start", async (ctx) => {
    await ctx.reply(
      `👟 *CANALAA Admin Bot*\n\n` +
      `*Tambah produk:*\n` +
      `Foto + caption \`\`\`\nRunner Black\n40=25cm\n41=26cm\`\`\`\n` +
      `atau /add untuk wizard\n\n` +
      `*Laporan penjualan harian:*\n` +
      `/laporan untuk lihat format, atau langsung kirim:\n` +
      `\`\`\`\nTODAY 12 MEI 2026\n1. NB 2002R(400-TF, 250)\n\`\`\`\n\n` +
      `*Perintah lain:*\n` +
      `/done /cancel /featured /help`,
      { parse_mode: "Markdown" },
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `*QUICK MODE (1 pesan):*\n` +
      `Kirim foto dengan caption:\n` +
      `\`\`\`\nNama Produk\n39-44\n\`\`\`\n` +
      `Bisa kirim album (banyak foto) — caption di foto pertama.\n\n` +
      `*Format ukuran:*\n` +
      `• \`39-44\` — range\n` +
      `• \`41,42\` — list\n` +
      `• \`40=25cm\` per baris — eksplisit (paling akurat)\n\n` +
      `*Caption opsional:*\n` +
      `• \`485000\` atau \`Rp 485k\` — set harga (default random 450k–530k)\n` +
      `• \`hide\` atau \`not featured\` — sembunyikan dari homepage\n\n` +
      `*Default:* semua produk auto-featured (muncul di homepage)\n\n` +
      `*Contoh:*\n` +
      `\`\`\`\nRunner Black\n40=25cm\n41=26cm\n485k\n\`\`\`\n\n` +
      `*WIZARD MODE:*\n` +
      `/add → ikuti pertanyaan satu per satu\n` +
      `/done /cancel`,
      { parse_mode: "Markdown" },
    );
  });

  bot.command("add", async (ctx) => {
    const userId = ctx.from!.id;
    resetState(userId);
    const state = getState(userId);
    state.step = "awaiting-name";
    await ctx.reply("📝 Kirim *nama produk*:", { parse_mode: "Markdown" });
  });

  bot.command("cancel", async (ctx) => {
    resetState(ctx.from!.id);
    await ctx.reply("🚫 Dibatalkan. Mulai lagi dengan /add.");
  });

  bot.command("featured", async (ctx) => {
    const state = getState(ctx.from!.id);
    if (state.step === "idle") {
      await ctx.reply("⚠️ Mulai produk dulu dengan /add.");
      return;
    }
    state.featured = !state.featured;
    await ctx.reply(
      state.featured
        ? "⭐ Featured: ON (akan muncul di homepage)"
        : "⭐ Featured: OFF",
    );
  });

  bot.command("done", async (ctx) => {
    const userId = ctx.from!.id;
    const state = getState(userId);

    if (state.step !== "awaiting-photos") {
      await ctx.reply(
        "⚠️ Belum siap. Lengkapi dulu: nama, harga, ukuran, dan minimal 1 foto.",
      );
      return;
    }
    if (!state.name || !state.price || !state.sizes || state.photos.length === 0) {
      await ctx.reply("⚠️ Data belum lengkap.");
      return;
    }

    await ctx.reply("⏳ Menyimpan produk...");

    try {
      const draft: DraftProduct = {
        name: state.name,
        price: state.price,
        sizes: state.sizes,
        photoBuffers: state.photos,
        featured: state.featured ?? true,
      };
      const { slug, id } = await createProductFromDraft(draft);
      resetState(userId);
      const site = getSiteUrl();
      await ctx.reply(
        `✅ *${draft.name}* berhasil dibuat!\n\n` +
        `→ ${site}/products/${slug}\n` +
        `→ ${site}/admin/collections/products\n\n` +
        `🤖 _Generating 2 AI marketing variants di background..._`,
        { parse_mode: "Markdown" },
      );
      await triggerAiMarketing(id);
    } catch (err) {
      console.error("[bot] create error:", err);
      await ctx.reply(`❌ Gagal menyimpan: ${(err as Error).message}`);
    }
  });

  bot.on("message:photo", async (ctx) => {
    const state = getState(ctx.from!.id);
    const photo = ctx.message.photo.at(-1);
    if (!photo) return;

    let buf: PhotoBuffer;
    try {
      buf = await downloadPhoto(ctx, photo.file_id);
    } catch (err) {
      console.error("[bot] photo download error:", err);
      await ctx.reply(`❌ Gagal download foto: ${(err as Error).message}`);
      return;
    }

    if (state.step === "awaiting-photos") {
      state.photos.push(buf);
      await ctx.reply(
        `📷 Foto ${state.photos.length} disimpan. Kirim foto lain atau /done untuk simpan.`,
      );
      return;
    }

    // Quick-add mode: photo (or album) with caption
    const mediaGroupId = ctx.message.media_group_id;
    const caption = ctx.message.caption;

    if (mediaGroupId) {
      bufferMediaGroup(ctx, mediaGroupId, buf, caption);
      return;
    }

    await handleQuickAdd(ctx, [buf], caption);
  });

  bot.on("message:text", async (ctx) => {
    const userId = ctx.from!.id;
    const state = getState(userId);
    const text = ctx.message.text.trim();

    if (text.startsWith("/")) return; // commands handled above

    if (state.step === "awaiting-name") {
      state.name = text;
      state.step = "awaiting-price";
      await ctx.reply(
        `✓ Nama: *${text}*\n\n💰 Kirim *harga* dalam IDR (contoh: 485000):`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    if (state.step === "awaiting-price") {
      const price = parseInt(text.replace(/[.,\s]/g, ""), 10);
      if (!Number.isFinite(price) || price <= 0) {
        await ctx.reply("⚠️ Harga harus angka. Contoh: 485000");
        return;
      }
      state.price = price;
      state.step = "awaiting-sizes";
      await ctx.reply(
        `✓ Harga: *Rp ${price.toLocaleString("id-ID")}*\n\n` +
        `📏 Kirim *ukuran tersedia* (contoh: 39-44 atau 39,40,42):`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    if (state.step === "awaiting-sizes") {
      const sizes = parseSizes(text);
      if (sizes.length === 0) {
        await ctx.reply(
          "⚠️ Format ukuran salah. Contoh: 39-44 atau 39,40,42",
        );
        return;
      }
      state.sizes = sizes;
      state.step = "awaiting-photos";
      const list = sizes.map((s) => `EU ${s.eu}`).join(", ");
      await ctx.reply(
        `✓ Ukuran: *${list}*\n\n` +
        `📷 Kirim *foto produk* (1 atau lebih).\n` +
        `Kalau sudah, kirim /done untuk simpan.\n` +
        `Tambah /featured untuk muncul di homepage.`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    // Expense report auto-detection (check before sales since headers differ)
    if (looksLikeExpenseReport(text)) {
      await handleExpenseReport(ctx, text);
      return;
    }

    // Sales report auto-detection — falls through if nothing matched the wizard
    if (looksLikeSalesReport(text)) {
      await handleSalesReport(ctx, text);
      return;
    }

    await ctx.reply(
      "Tambah produk → /add\nLaporan penjualan → /laporan\nLaporan biaya → /biaya\nPanduan → /help",
    );
  });

  bot.command("laporan", async (ctx) => {
    await ctx.reply(
      "📋 Kirim laporan penjualan dengan format:\n\n" +
      "```\nTODAY 12 MEI 2026\n\n" +
      "1. NB 2002R ABU(400-TF, 250)\n" +
      "2. BLEZER WARNA WARNI(200-CASH, 120)\n```\n\n" +
      "Format per item: `N. Nama Produk(JUAL-METODE, MODAL)` — harga dan modal dalam ribuan.",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("biaya", async (ctx) => {
    await ctx.reply(
      "💸 Kirim laporan biaya operasional bulanan dengan format:\n\n" +
      "```\nBIAYA FEB 2026\n\n" +
      "Internet 177\n" +
      "Listrik 1000\n" +
      "Sewa toko 2666.667\n" +
      "Gaji karyawan 2640\n" +
      "Konsumsi 700\n" +
      "Plastik 172.2\n" +
      "Maintenance 100\n```\n\n" +
      "*Aturan:*\n" +
      "• Header: `BIAYA <bulan> <tahun>` (contoh: BIAYA FEB 2026)\n" +
      "• Per baris: `<kategori> <jumlah-ribuan>` — contoh `Internet 177` = Rp 177.000\n" +
      "• Skip kategori bernilai 0\n" +
      "• Bot auto-deteksi tetap/variable dari kategori\n\n" +
      "*Kategori valid:* Internet, Listrik, Sewa toko, Gaji karyawan, Bonus, THR, " +
      "Konsumsi, Renovasi, Plastik, Kardus, Kaos kaki, Maintenance, Ads IG, Shoes care, Price tag.",
      { parse_mode: "Markdown" },
    );
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [action, payload] = data.split(":");
    // payload format varies per action; ids are always the comma-list before any | separator
    const [idsPart, extra] = (payload ?? "").split("|");
    const ids = (idsPart ?? "").split(",").filter(Boolean);

    const knownActions = new Set([
      "sale-confirm",
      "sale-reject",
      "expense-confirm",
      "expense-reject",
      "expense-replace",
    ]);
    if (!knownActions.has(action)) {
      await ctx.answerCallbackQuery();
      return;
    }
    if (ids.length === 0) {
      await ctx.answerCallbackQuery({ text: "Tidak ada item untuk diproses." });
      return;
    }

    try {
      if (action === "sale-confirm") {
        await confirmSales(ids);
        await ctx.editMessageReplyMarkup(undefined);
        await ctx.reply(
          `✅ ${ids.length} penjualan tersimpan.\n→ ${getSiteUrl()}/dashboard`,
        );
      } else if (action === "sale-reject") {
        await rejectSales(ids);
        await ctx.editMessageReplyMarkup(undefined);
        await ctx.reply(`❌ ${ids.length} penjualan dibatalkan.`);
      } else if (action === "expense-confirm") {
        await confirmExpenses(ids);
        await ctx.editMessageReplyMarkup(undefined);
        await ctx.reply(
          `✅ ${ids.length} biaya tersimpan.\n→ ${getSiteUrl()}/dashboard`,
        );
      } else if (action === "expense-reject") {
        await rejectExpenses(ids);
        await ctx.editMessageReplyMarkup(undefined);
        await ctx.reply(`❌ ${ids.length} biaya dibatalkan.`);
      } else if (action === "expense-replace") {
        const monthDate = extra ? new Date(extra) : null;
        let removed = 0;
        if (monthDate && !Number.isNaN(monthDate.getTime())) {
          removed = await deleteConfirmedExpensesForMonth(monthDate);
        }
        await confirmExpenses(ids);
        await ctx.editMessageReplyMarkup(undefined);
        await ctx.reply(
          `♻️ ${removed} biaya lama dihapus, ${ids.length} biaya baru tersimpan.\n→ ${getSiteUrl()}/dashboard`,
        );
      }
      await ctx.answerCallbackQuery();
    } catch (err) {
      console.error("[bot] callback error:", err);
      await ctx.answerCallbackQuery({ text: "Gagal memproses." });
      await ctx.reply(`❌ Error: ${(err as Error).message}`);
    }
  });

  bot.catch((err) => {
    console.error("[bot] error:", err);
  });

  return bot;
}
