import { serve } from "inngest/next";

import { client, functions } from "@jitaspace/eve-scrape";

export const { GET, POST, PUT } = serve({ client, functions });
