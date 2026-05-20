import { Bot, Context } from "grammy";
import {
  createProductFromDraft,
  parseCaption,
  parseSizes,
  randomPriceIDR,
  type DraftProduct,
  type DraftSize,
} from "./payload-api";

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
    `⏳ Membuat *${parsed.name}* (${photos.length} foto, ${parsed.sizes!.length} ukuran${
      priceWasRandom ? `, harga random Rp ${price.toLocaleString("id-ID")}` : ""
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
    const { slug } = await createProductFromDraft(draft);
    await ctx.reply(
      `✅ *${draft.name}* berhasil dibuat!\n\n` +
        `→ http://localhost:3000/products/${slug}\n` +
        `→ http://localhost:3000/admin/collections/products`,
      { parse_mode: "Markdown" },
    );
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
        `*Dua cara tambah produk:*\n\n` +
        `*1. Quick (1 pesan)*\n` +
        `Kirim foto + caption:\n` +
        `\`\`\`\nRunner Black\n40=25cm\n41=26cm\n\`\`\`\n` +
        `→ produk langsung dibuat (harga random 450k–530k, auto-featured)\n\n` +
        `*2. Wizard (step-by-step)*\n` +
        `/add — mulai, lalu ikuti pertanyaan\n\n` +
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
      const { slug } = await createProductFromDraft(draft);
      resetState(userId);
      await ctx.reply(
        `✅ *${draft.name}* berhasil dibuat!\n\n` +
          `→ http://localhost:3000/products/${slug}\n` +
          `→ http://localhost:3000/admin/collections/products`,
        { parse_mode: "Markdown" },
      );
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

    await ctx.reply(
      "💡 Mulai produk baru dengan /add atau lihat /help",
    );
  });

  bot.catch((err) => {
    console.error("[bot] error:", err);
  });

  return bot;
}
