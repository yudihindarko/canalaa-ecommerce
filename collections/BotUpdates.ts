import type { CollectionConfig } from "payload";

/**
 * Tracks Telegram update_ids the bot has already processed.
 * Used as an atomic idempotency gate via the unique constraint on updateId:
 * the webhook attempts to insert before processing; if the insert fails with
 * a unique violation, the update was already delivered and we skip it.
 *
 * Hidden from admin UI — pure plumbing.
 */
export const BotUpdates: CollectionConfig = {
  slug: "bot-updates",
  admin: {
    hidden: true,
  },
  fields: [
    {
      name: "updateId",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
  ],
};
