import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";
import { reactConfig } from "@jitaspace/eslint-config/react";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
  restrictEnvAccess,
);
