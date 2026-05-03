import { createDiscordAdapter } from "@chat-adapter/discord";
import { createRedisState } from "@chat-adapter/state-redis";
import {
  Actions,
  Button,
  Card,
  CardChild,
  CardText,
  Chat,
  Divider,
  Field,
  Fields,
  CardText as Text,
} from "chat";

const discordAdapter = process.env.DISCORD_BOT_TOKEN
  ? createDiscordAdapter()
  : undefined;

export const chat = new Chat({
  userName: "JitaSpace",
  adapters: discordAdapter
    ? {
        discord: discordAdapter,
      }
    : {},
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

const updatesChannelId = process.env.DISCORD_UPDATES_CHANNEL_ID;

export const updatesChannel =
  discordAdapter && updatesChannelId
    ? chat.channel(`discord:1127970667522949201:${updatesChannelId}`)
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

type UpdateStatus = "success" | "idle" | "rate_limited" | "failed";

type UpdateCardOptions = {
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
};

const STATUS_LABELS: Record<UpdateStatus, string> = {
  success: "Success",
  idle: "Idle",
  rate_limited: "Rate limited",
  failed: "Failed",
};

export const postUpdateCard = async (options: UpdateCardOptions) => {
  if (!updatesChannel) {
    return;
  }

  const fields: ReturnType<typeof Field>[] = [];
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
