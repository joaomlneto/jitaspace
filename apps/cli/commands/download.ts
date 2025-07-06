import { createCommand } from "@commander-js/extra-typings";

import { globalProgress } from "../lib/progress.js";
import { ensureSdePresentAndExtracted } from "../utils/sde.js";

export default createCommand("download-only")
  .description("Retrieve the latest SDE archive and extracts it")
  .action(async (options) => {
    await ensureSdePresentAndExtracted();

    globalProgress.stop();
  });
