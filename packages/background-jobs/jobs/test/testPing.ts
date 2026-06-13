import { defineJob } from "../../core";

export interface PingEventPayload {
  data: {};
}

export const testPing = defineJob<PingEventPayload["data"]>({
  id: "ping",
  name: "Ping",
  trigger: { type: "event" },
  handler: async (ctx) => {
    return { payload: ctx.payload, body: "Pong!" };
  },
});
