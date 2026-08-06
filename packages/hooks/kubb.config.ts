import { defineConfig } from "@kubb/core";

import { pluginMultiEsiQuery } from "./kubb/pluginMultiEsiQuery";

export default defineConfig(() => {
  return {
    name: "hooks-multi-esi-query",
    root: ".",
    input: {
      // The same spec @jitaspace/esi-client generates from, so the multi-subject
      // hooks and the single-subject ones can never describe different APIs.
      path: "../esi-client/swagger.json",
    },
    output: {
      path: "./src/generated",
      // The generated hooks are re-exported through src/hooks/index.ts, which is
      // hand-written; kubb only owns src/generated.
      barrelType: false,
    },
    plugins: [pluginMultiEsiQuery({})],
  };
});
