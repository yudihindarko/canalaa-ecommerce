import { webhookCallback } from "grammy";
import { after } from "next/server";
import { buildBot } from "@/lib/telegram-bot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pattern: ack Telegram in <100ms, run the bot in the background.
 *
 * Telegram retries the webhook if it doesn't get a 200 within ~60s.
 * Our bot path (download photo + R2 upload + Postgres insert) can be
 * slow enough on a cold start that Telegram retries before we reply,
 * which doubled-up products. Returning 200 immediately and using
 * Next.js's after() to do the work post-response means there is
 * nothing to retry — and we don't need an idempotency table.
 */
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return new Response("TELEGRAM_BOT_TOKEN not configured", { status: 500 });
  }

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const received = req.headers.get("x-telegram-bot-api-secret-token");
    if (received !== expected) {
      return new Response("unauthorized", { status: 401 });
    }
  }

  // Consume body now so we can hand a fresh Request to grammy in the background
  const bodyText = await req.text();
  const url = req.url;
  const headers = req.headers;

  after(async () => {
    try {
      const forwardedReq = new Request(url, {
        method: "POST",
        headers,
        body: bodyText,
      });
      const bot = buildBot(token);
      const handle = webhookCallback(bot, "std/http");
      await handle(forwardedReq);
    } catch (err) {
      console.error("[webhook] background processing error:", err);
    }
  });

  return new Response("ok", { status: 200 });
}

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      bot: "CANALAA admin",
      mode: "webhook (background)",
      note: "POST endpoint for Telegram updates",
    }),
    { headers: { "content-type": "application/json" } },
  );
}
