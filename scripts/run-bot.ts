import { buildBot } from "../lib/telegram-bot";

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminIds = process.env.TELEGRAM_ADMIN_IDS;

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env.local");
  process.exit(1);
}

if (!adminIds) {
  console.warn(
    "⚠️  TELEGRAM_ADMIN_IDS not set — every message will be rejected.\n" +
      "    Send /start to the bot, then add your user ID to .env.local.",
  );
}

const bot = buildBot(token);

console.log("🤖 CANALAA bot starting (polling mode)...");
console.log(`   Admin IDs: ${adminIds ?? "(none)"}`);

bot.start({
  onStart: (info) => {
    console.log(`✓ Bot online: @${info.username}`);
    console.log(`  Open Telegram → @${info.username} → send /start`);
  },
});
