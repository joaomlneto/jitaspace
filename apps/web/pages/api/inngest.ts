import { serve } from "inngest/next";

import { functions, inngest } from "@jitaspace/eve-scrape";

export default serve(inngest, functions);
