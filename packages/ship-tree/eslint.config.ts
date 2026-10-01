import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";
import { reactConfig } from "@jitaspace/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**", "coverage/**"],
  },
  baseConfig,
  reactConfig,
  restrictEnvAccess,
  {
    // postcss.cjs is plain CommonJS, loaded by Node through the PostCSS config.
    files: ["**/*.cjs"],
    languageOptions: { globals: { module: "writable" } },
  },
);
