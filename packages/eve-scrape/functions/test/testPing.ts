import { client } from "../../client";

export type PingEventPayload = {
  data: {};
};

export const testPing = client.createFunction(
  {
    id: "ping",
    name: "Ping",
  },
  { event: "ping" },
  async ({ event }) => {
    return { event, body: "Pong!" };
  },
);
