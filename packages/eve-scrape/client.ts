import { EventSchemas, Inngest } from "inngest";

import { env } from "./env.mjs";
import { Events } from "./events";

// Create a client to send and receive events
export const inngest = new Inngest({
  name: "@jita.space/eve-scrape",
  eventKey: env.INNGEST_SIGNING_KEY,
  schemas: new EventSchemas().fromRecord<Events>(),
});
