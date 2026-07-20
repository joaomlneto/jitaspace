import type { ChatInstance } from "@jitaspace/chat";
import { createChat } from "@jitaspace/chat";

import { env } from "./env";

/**
 * Lazy per-package chat bot singleton.
 *
 * `createChat` builds a Discord adapter + Redis-backed state and registers
 * listeners at construction, so — like `kv` — we defer it until first use. The
 * Trigger.dev build imports every task module to index it; an eager
 * `createChat()` would open Discord/Redis connections at deploy/index time (and
 * on every cold start). Only the zKillboard job posts updates.
 */
let chatInstance: ChatInstance | undefined;

const getChat = (): ChatInstance => {
  chatInstance ??= createChat({
    discordBotToken: env.DISCORD_BOT_TOKEN,
    discordUpdatesChannelId: env.DISCORD_UPDATES_CHANNEL_ID,
  });
  return chatInstance;
};

export const postUpdateCard: ChatInstance["postUpdateCard"] = (options) =>
  getChat().postUpdateCard(options);

export * from "@jitaspace/chat";
