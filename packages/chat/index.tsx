import type { CardChild, FieldElement } from "chat";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createRedisState } from "@chat-adapter/state-redis";
import {
  Actions,
  Button,
  Card,
  CardText,
  Chat,
  Divider,
  Field,
  Fields,
  CardText as Text,
} from "chat";

export interface CreateChatOptions {
  /** Discord bot token. When absent, the Discord adapter is disabled. */
  discordBotToken?: string;
  /** Discord channel id used for posting update cards. */
  discordUpdatesChannelId?: string;
}

type UpdateStatus = "success" | "idle" | "rate_limited" | "failed";

interface UpdateCardOptions {
  status: UpdateStatus;
  summary: string;
  processed?: number;
  range?: string;
  lag?: string;
  latestSequence?: bigint | string | null;
  nextSequence?: bigint | string | null;
  attackers?: number;
  victimItems?: number;
  throttledUntil?: string | null;
}

const STATUS_LABELS: Record<UpdateStatus, string> = {
  success: "Success",
  idle: "Idle",
  rate_limited: "Rate limited",
  failed: "Failed",
};

/**
 * Create the chat bot (Discord adapter + handlers) and its helpers.
 *
 * This package reads no environment variables: callers (apps) inject the Discord
 * bot token and updates-channel id from their own validated env.
 */
export function createChat({
  discordBotToken,
  discordUpdatesChannelId,
}: CreateChatOptions = {}) {
  const discordAdapter = discordBotToken ? createDiscordAdapter() : undefined;

  const chat = new Chat({
    userName: "JitaSpace",
    adapters: discordAdapter ? { discord: discordAdapter } : {},
    state: createRedisState(),
  });

  // Respond when someone @mentions the bot
  chat.onNewMention(async (thread) => {
    await thread.subscribe();
    await thread.post(
      Card({
        title: "Support",
        children: [
          Text(
            "Hey! I'm here to help. Ask your question in this thread and I'll do my best to answer it.",
          ),
          Divider(),
          Actions([
            Button({
              id: "escalate",
              style: "danger",
              label: "Do not click this test button",
            }),
          ]),
        ],
      }),
    );
  });

  const updatesChannel =
    discordAdapter && discordUpdatesChannelId
      ? chat.channel(`discord:1127970667522949201:${discordUpdatesChannelId}`)
      : null;

  // Respond when someone clicks escalate button
  chat.onAction("escalate", async (event) => {
    await event.thread?.post(
      `${event.user.fullName} disobeyed and clicked the test button.`,
    );
  });

  // Respond to follow-up messages in subscribed threads
  chat.onSubscribedMessage(async (thread, message) => {
    await thread.startTyping();
    await thread.post(`You said: ${message.text}`);
  });

  const postUpdateCard = async (options: UpdateCardOptions) => {
    if (!updatesChannel) {
      return;
    }

    const fields: FieldElement[] = [];
    const addField = (
      label: string,
      value: string | number | bigint | null | undefined,
    ) => {
      if (value === null || value === undefined) return;
      fields.push(
        Field({
          label,
          value: value.toString(),
        }),
      );
    };

    addField("Processed", options.processed);
    addField("Range", options.range);
    addField("Lag", options.lag);
    addField("Latest cursor", options.latestSequence ?? null);
    addField("Next cursor", options.nextSequence ?? null);
    addField("Attackers", options.attackers);
    addField("Victim items", options.victimItems);
    addField("Throttled until", options.throttledUntil ?? null);

    const children: CardChild[] = [CardText(options.summary)];
    if (fields.length > 0) {
      children.push(Divider(), Fields(fields));
    }

    await updatesChannel.post(
      Card({
        title: "scrapeRecentKills",
        subtitle: STATUS_LABELS[options.status],
        children,
      }),
    );
  };

  return { chat, updatesChannel, postUpdateCard };
}

export type ChatInstance = ReturnType<typeof createChat>;
