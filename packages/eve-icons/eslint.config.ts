import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";
import { reactConfig } from "@jitaspace/eslint-config/react";

export default defineConfig(
  {
    // `src/generated/**` is written by scripts/generate.ts (one component per
    // icon, artwork inlined) and excluded like other generated output.
    ignores: ["dist/**", "coverage/**", "src/generated/**"],
  },
  baseConfig,
  reactConfig,
  restrictEnvAccess,
);
