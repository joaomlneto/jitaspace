import { EventSchemas, Inngest, slugify } from "inngest";

import { env } from "./env";
import { Events } from "./events";

// Create a client to send and receive events
export const client = new Inngest({
  id: slugify("jitaspace"),
  eventKey: env.INNGEST_EVENT_KEY,
  schemas: new EventSchemas().fromRecord<Events>(),
});
