import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jitaspace/eslint-config/base";
import { nextjsConfig } from "@jitaspace/eslint-config/nextjs";
import { reactConfig } from "@jitaspace/eslint-config/react";

export default defineConfig(
  {
    // Cypress files run under Cypress's own runner/tsconfig (they use the
    // `cy`/`Cypress` globals and are excluded from the app tsconfig, so the
    // type-aware parser can't resolve them). The scaffolded example specs
    // (`1-getting-started`, `2-advanced-examples`) are vendor boilerplate.
    // None of these are app source, so keep them out of the app lint.
    ignores: [
      ".next/**",
      "cypress/**",
      "**/*.cy.ts",
      "**/*.cy.tsx",
    ],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
