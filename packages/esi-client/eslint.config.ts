import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";

export default defineConfig(
  {
    // Generated kubb output is not hand-maintained; keep it out of lint.
    ignores: ["dist/**", "src/generated/**"],
  },
  baseConfig,
  restrictEnvAccess,
);
