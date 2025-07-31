import { serve } from "inngest/next";

import { client, functions } from "@jitaspace/eve-scrape";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    responseLimit: "50mb",
  },
};

export default serve({ client, functions });
