import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";

export default defineConfig(
  {
    // Generated Prisma client and one-shot ingestion scripts are not linted.
    ignores: ["dist/**", "prisma/generated/**", "scripts/**"],
  },
  baseConfig,
  restrictEnvAccess,
);
