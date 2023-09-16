import { Inngest } from "inngest";

import { env } from "./env.mjs";

// Create a client to send and receive events
export const inngest = new Inngest({
  name: "My App",
  eventKey: env.INNGEST_SIGNING_KEY,
});
