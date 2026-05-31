import { eventType, staticSchema } from "inngest";

import { client } from "../../client";

export type PingEventPayload = {
  data: {};
};

export const testPingEvent = eventType("ping", {
  schema: staticSchema<PingEventPayload["data"]>(),
});

export const testPing = client.createFunction(
  {
    id: "ping",
    triggers: [testPingEvent],
    name: "Ping",
  },
  async ({ event }) => {
    return { event, body: "Pong!" };
  },
);
