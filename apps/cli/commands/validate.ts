import { createCommand } from "@commander-js/extra-typings";

import { getWorkingDirectory } from "../lib/cli.js";
import { globalProgress } from "../lib/progress.js";
import { getEveRefDataDirectoryContents } from "../utils/everef.js";

export default createCommand("validate").action(async (options) => {
  console.log("work dir is:", getWorkingDirectory());
  const contents = await getEveRefDataDirectoryContents(
    "https://data.everef.net/public-contracts/",
  );
  console.log(JSON.stringify(contents, null, 2));

  globalProgress.stop();
});
