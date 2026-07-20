import { defineJob } from "../../core";

export interface PingEventPayload {
  data: Record<string, never>;
}

export const testPing = defineJob<PingEventPayload["data"]>({
  id: "ping",
  name: "Ping",
  trigger: { type: "event" },
  handler: (ctx) => {
    return Promise.resolve({ payload: ctx.payload, body: "Pong!" });
  },
});
