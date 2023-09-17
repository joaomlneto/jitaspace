import { inngest } from "../../client";

export type PingEventPayload = {
  data: {};
};

export const testPing = inngest.createFunction(
  { name: "Ping" },
  { event: "ping" },
  async ({ event, step }) => {
    return { event, body: "Pong!" };
  },
);
