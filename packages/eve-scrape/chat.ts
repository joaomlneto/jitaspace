import { createChat } from "@jitaspace/chat";

import { env } from "./env";

/**
 * Per-package chat bot singleton.
 *
 * `@jitaspace/chat` reads no environment variables; we build the bot here from
 * this package's validated env. We re-export everything from `@jitaspace/chat`
 * so callers get the helpers and types from one module
 * (`import { postUpdateCard } from "../../../chat"`).
 */
// `@jitaspace/chat` is fully typed and type-checks, but eve-scrape's
// type-aware lint resolves this workspace import as `any` — a pre-existing
// cross-package limitation that affects other imports in this package too.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const { chat, updatesChannel, postUpdateCard } = createChat({
  discordBotToken: env.DISCORD_BOT_TOKEN,
  discordUpdatesChannelId: env.DISCORD_UPDATES_CHANNEL_ID,
});

export * from "@jitaspace/chat";
