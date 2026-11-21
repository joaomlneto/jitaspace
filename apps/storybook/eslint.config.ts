import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";
import { reactConfig } from "@jitaspace/eslint-config/react";

export default defineConfig(
  {
    ignores: ["storybook-static/**"],
  },
  baseConfig,
  reactConfig,
  restrictEnvAccess,
);
