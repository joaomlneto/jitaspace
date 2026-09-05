import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";
import { nextjsConfig } from "@jitaspace/eslint-config/nextjs";
import { reactConfig } from "@jitaspace/eslint-config/react";

export default defineConfig(
  {
    // Cypress files run under Cypress's own runner/tsconfig (they use the
    // `cy`/`Cypress` globals and are excluded from the app tsconfig, so the
    // type-aware parser can't resolve them), so keep them out of the app lint.
    // Note this means cypress/e2e/smoke.cy.ts is neither linted nor
    // type-checked — worth revisiting if that suite grows.
    ignores: [".next/**", "cypress/**", "**/*.cy.ts", "**/*.cy.tsx"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
