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
      // Wipe the directory each run: kubb only writes files, so an endpoint
      // that stops qualifying (a spec change, a new skip rule) would otherwise
      // leave a stale hook behind that still compiles.
      clean: true,
      // The generated hooks are re-exported through src/hooks/index.ts, which is
      // hand-written; kubb only owns src/generated.
      barrelType: false,
    },
    plugins: [pluginMultiEsiQuery({})],
  };
});
