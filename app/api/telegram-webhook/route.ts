import { webhookCallback } from "grammy";
import { getPayload } from "payload";
import config from "@payload-config";
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

  // Read body once so we can parse update_id for idempotency AND re-feed it to grammy
  const bodyText = await req.text();
  let updateId: number | undefined;
  try {
    const parsed = JSON.parse(bodyText) as { update_id?: number };
    updateId = parsed.update_id;
  } catch {
    // If body isn't valid JSON, let grammy reject it
  }

  // Idempotency gate: attempt to record this update_id atomically.
  // Unique constraint violation = Telegram retry; ack with 200 and stop.
  if (updateId !== undefined) {
    try {
      const payload = await getPayload({ config });
      await payload.create({
        collection: "bot-updates",
        data: { updateId: String(updateId) },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/unique|duplicate/i.test(msg)) {
        return new Response("duplicate update, already processed", {
          status: 200,
        });
      }
      // Some other failure — log but proceed so we don't block real updates
      console.error("[webhook] idempotency check error:", err);
    }
  }

  // Re-build the request because we already consumed the body
  const forwardedReq = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: bodyText,
  });

  const bot = buildBot(token);
  const handle = webhookCallback(bot, "std/http");
  return handle(forwardedReq);
}

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      bot: "CANALAA admin",
      mode: "webhook",
      idempotent: true,
      note: "POST endpoint for Telegram updates",
    }),
    { headers: { "content-type": "application/json" } },
  );
}
