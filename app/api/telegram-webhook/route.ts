import { webhookCallback } from "grammy";
import { buildBot } from "@/lib/telegram-bot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const bot = buildBot(token);
  const handle = webhookCallback(bot, "std/http");
  return handle(req);
}

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      bot: "CANALAA admin",
      mode: "webhook",
      note: "POST endpoint for Telegram updates",
    }),
    { headers: { "content-type": "application/json" } },
  );
}
