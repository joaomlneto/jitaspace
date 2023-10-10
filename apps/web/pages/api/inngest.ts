import { serve } from "inngest/next";

import { client, functions } from "@jitaspace/eve-scrape";





export default serve({ client, functions });
